#!/bin/bash

set -eux

sudo apt-get update
sudo apt-get install vim-nox

cat << 'EOF' > ~/.vimrc
unlet! skip_defaults_vim
source $VIMRUNTIME/defaults.vim

set autoindent                  " 新しい行のインデントを現在行と同じにする
set autoread                    " Vimの外部で変更されたら自動的に読み直す
set background=dark             " ハイライト色の指定に使用
set backspace=indent,eol,start  " 行頭でのバックスペースの振る舞いをカスタマイズ
set display=lastline            " テキストの表示方法を指定する
set encoding=utf-8              " Vim内部で使われる文字エンコーディングを設定する
set expandtab                   " <Tab>入力でスペースを入力する
set fileignorecase              " ファイル名の大文字と小文字を区別するかどうか
set hidden                      " バッファを破棄する代わりに隠す
set hlsearch                    " 前回の検索パターンを強調表示する
set ignorecase                  " 検索パターンで大文字と小文字を区別しない
set incsearch                   " 検索パターンを入力中にその文字を強調表示する
set lazyredraw                  " マクロ実行中に表示を更新しない
set list                        " <Tab>や<EOL>を表示する
set listchars=tab:>-,trail:-    " 'list' での表示に使われる文字を設定する
set mouse=                      " マウス操作を無効にする
set number                      " 行番号を表示する
set scrolloff=999               " カーソルをウィンドウ中央に置く
set shiftwidth=2                " 自動インデントに使われる空白の数
set showmatch                   " 括弧入力時に対応する括弧を知らせる
set smartcase                   " 検索パターンが大文字を含むときは文字の大小を区別する
set smartindent                 " 高度な自動インデントを行う
set tabstop=2                   " <Tab>が対応する空白の数
set ttyfast                     " 高速ターミナル接続を行う
set virtualedit=block           " ビジュアルモードで行末より後ろにカーソルを移動できる
set whichwrap=<,>,[,]           " カーソルキーで行頭と行末を移動できる
set wrapscan                    " 検索がファイル末尾まで進んだら先頭から再検索する

set laststatus=2
set statusline=%<%F%m%r%h%w%y%q%=[C=%c/%{col('$')-1}][L=%l/%L]
EOF
