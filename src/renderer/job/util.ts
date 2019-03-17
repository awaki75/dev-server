import * as child_process from 'child_process';
import * as decompress from 'decompress';
import * as fs from 'fs';
import * as request from 'request';
import { promisify } from 'util';
export { basename, join as joinpath } from 'path';
export { spawn, ChildProcess } from 'child_process';

function toPromise(stream: fs.WriteStream | NodeJS.WritableStream) {
  return new Promise<never>((resolve, reject) => {
    stream.on('finish', () => {
      resolve();
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
}

export const copyFile = promisify(fs.copyFile);
export const exec = promisify(child_process.exec);
export const exists = promisify(fs.exists);
export const mkdir = promisify(fs.mkdir);

export function download(url: string, path: string) {
  const req = request.get(url);
  const writeStream = fs.createWriteStream(path);
  return toPromise(req.pipe(writeStream));
}

export async function extract(src: string, dst: string) {
  await decompress(src, dst, { strip: 1 });
}

export function getrequest(url: string) {
  return new Promise<any>((resolve, reject) => {
    request.get(url, (err, response, body) => {
      if (err || response.statusCode !== 200) {
        reject(err);
        return;
      }
      resolve(body);
    });
  });
}
