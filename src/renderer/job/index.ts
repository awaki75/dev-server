import * as cassandra from 'cassandra-driver';
import * as IORedis from 'ioredis';
import { basename, download, exists, joinpath, mkdir, extract, exec, spawn, ChildProcess, getrequest } from './util';

const DOWNLOAD_DIR = 'c:/dev-server/download';
const APPLICATION_DIR = 'c:/dev-server/application';

interface DownloadUnit {
  url: string;
  fileName?: string;
  applicationName?: string;
}

const DOWNLOAD_LIST: DownloadUnit[] = [
  {
    url:
      'https://github.com/AdoptOpenJDK/openjdk8-binaries/releases/download/jdk8u202-b08/OpenJDK8U-jre_x64_windows_hotspot_8u202b08.zip',
    applicationName: 'jdk8u202-b08-jre',
  },
  {
    url: 'https://archive.apache.org/dist/cassandra/2.1.21/apache-cassandra-2.1.21-bin.tar.gz',
    applicationName: 'apache-cassandra-2.1.21',
  },
  {
    url:
      'https://download.elastic.co/elasticsearch/release/org/elasticsearch/distribution/tar/elasticsearch/2.3.5/elasticsearch-2.3.5.tar.gz',
    applicationName: 'elasticsearch-2.3.5',
  },
  {
    url: 'https://github.com/MicrosoftArchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.zip',
    applicationName: 'redis-3.2.100',
  },
  { url: 'https://nginx.org/download/nginx-1.14.2.zip', applicationName: 'nginx-1.14.2' },
  {
    url: 'https://archive.apache.org/dist/tomcat/tomcat-8/v8.0.53/bin/apache-tomcat-8.0.53-windows-x64.zip',
    applicationName: 'apache-tomcat-8.0.53',
  },
  {
    url: 'https://github.com/mobz/elasticsearch-head/archive/f1b28e84151abddd178ce21b859ce33621cf5620.zip',
    fileName: 'elasticsearch-head-f1b28e84151abddd178ce21b859ce33621cf5620.zip',
  },
];

async function downloadFile(url: string, fileName: string) {
  const path = joinpath(DOWNLOAD_DIR, fileName);
  if (!(await exists(path))) {
    console.log(`downloading ${url}`);
    await download(url, path);
  }
}

async function extractFile(fileName: string, applicationName: string) {
  const src = joinpath(DOWNLOAD_DIR, fileName);
  const dst = joinpath(APPLICATION_DIR, applicationName);
  if (!(await exists(dst))) {
    console.log(`extracting ${fileName}`);
    await extract(src, dst);
  }
}

async function execCommand(command: string, cwd: string) {
  const { stdout, stderr } = await exec(command, {
    cwd,
    env: {
      PATH: joinpath(APPLICATION_DIR, 'jdk8u202-b08-jre/bin'),
      JAVA_HOME: joinpath(APPLICATION_DIR, 'jdk8u202-b08-jre'),
    },
  });
  if (stdout) {
    console.log(stdout);
  }
  if (stderr) {
    console.log(stderr);
  }
}

async function installEsPlugin(fileName: string, pluginName: string) {
  const pluginPath = joinpath(APPLICATION_DIR, 'elasticsearch-2.3.5/plugins', pluginName);
  const filePath = joinpath(DOWNLOAD_DIR, fileName);
  const cwd = joinpath(APPLICATION_DIR, 'elasticsearch-2.3.5');
  if (!(await exists(pluginPath))) {
    console.log(`installing ${pluginName}`);
    await execCommand(`.\\bin\\plugin.bat install file:///${filePath}`, cwd);
  }
}

const processMap = new Map<string, ChildProcess>();

async function start(command: string, cwd: string) {
  console.log(command);
  const [cmd, ...args] = command.split(' ');
  const process = spawn(cmd, args, {
    cwd,
    env: {
      PATH: joinpath(APPLICATION_DIR, 'jdk8u202-b08-jre/bin'),
      JAVA_HOME: joinpath(APPLICATION_DIR, 'jdk8u202-b08-jre'),
    },
  });
  if (process.stdout) {
    process.stdout.setEncoding('utf8');
    process.stdout.on('data', (data) => {
      console.log(data);
    });
  }
  if (process.stderr) {
    process.stderr.setEncoding('utf8');
    process.stderr.on('data', (data) => {
      console.log(data);
    });
  }
  processMap.set(command, process);
}

async function isCassandraStarted() {
  let client: cassandra.Client | undefined;
  try {
    client = new cassandra.Client({ contactPoints: ['127.0.0.1'], localDataCenter: 'datacenter1' });
    await client.connect();
    await client.execute('SELECT NOW() FROM system.local');
  } catch (err) {
    if (client) {
      client.shutdown();
    }
    return false;
  }
  client.shutdown();
  return true;
}

async function isEsStarted() {
  try {
    const body = await getrequest('http://127.0.0.1:9200/_cluster/health');
    const json = JSON.parse(body);
    return json.status === 'green';
  } catch (err) {
    return false;
  }
}

async function isRedisStarted() {
  let redis: IORedis.Redis | undefined;
  try {
    redis = new IORedis();
    redis.on('error', (err) => {
      if (redis) {
        redis.disconnect();
      }
    });
    await redis.ping();
  } catch (err) {
    if (redis) {
      redis.disconnect();
    }
    return false;
  }
  redis.disconnect();
  return true;
}

function sleep(ms: number) {
  return new Promise<never>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function healthCheck(fn: () => Promise<boolean>) {
  while (true) {
    if (await fn()) {
      break;
    }
    console.log('waiting');
    await sleep(10000);
  }
}

export async function run() {
  const jobs: Array<() => Promise<unknown>> = [];

  jobs.push(() => mkdir(DOWNLOAD_DIR, { recursive: true }));
  for (const unit of DOWNLOAD_LIST) {
    const fileName = unit.fileName || basename(unit.url);
    jobs.push(() => downloadFile(unit.url, fileName));
  }
  jobs.push(() => mkdir(APPLICATION_DIR, { recursive: true }));
  for (const unit of DOWNLOAD_LIST) {
    if (unit.applicationName) {
      const fileName = unit.fileName || basename(unit.url);
      const applicationName = unit.applicationName;
      jobs.push(() => extractFile(fileName, applicationName));
    }
  }
  jobs.push(() => installEsPlugin('elasticsearch-head-f1b28e84151abddd178ce21b859ce33621cf5620.zip', 'head'));
  jobs.push(() => start('.\\bin\\cassandra.bat', joinpath(APPLICATION_DIR, 'apache-cassandra-2.1.21')));
  jobs.push(() => healthCheck(isCassandraStarted));
  jobs.push(() => start('.\\bin\\elasticsearch.bat', joinpath(APPLICATION_DIR, 'elasticsearch-2.3.5')));
  jobs.push(() => healthCheck(isEsStarted));
  jobs.push(() => start('.\\redis-server.exe', joinpath(APPLICATION_DIR, 'redis-3.2.100')));
  jobs.push(() => healthCheck(isRedisStarted));
  // jobs.push(() => start('.\\nginx.exe', joinpath(APPLICATION_DIR, 'nginx-1.14.2')));
  jobs.push(async () => console.log('******** ok ********'));

  for (const job of jobs) {
    await job();
  }
}

run();

process.on('SIGINT', function() {
  for (const p of processMap.values()) {
    p.kill();
  }
  process.exit();
});
