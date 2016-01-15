Twitter 原寸びゅー (twOpenOriginalImage)
========================================

- License: The MIT license  
- Copyright (c) 2016 風柳(furyu)  
- 対象ブラウザ： Google Chrome、Firefox、Opera


■ インストール方法 
---
### Google Chrome 拡張機能版
Google Chrome、あるいは Opera＋[Download Chrome Extension](https://addons.opera.com/ja/extensions/details/download-chrome-extension-9/?display=en)の環境で、

> [Twitter 原寸びゅー](https://chrome.google.com/webstore/detail/twitter-%E5%8E%9F%E5%AF%B8%E3%81%B3%E3%82%85%E3%83%BC/bkpaljhmpehdbjkoahohlhkhlleaicel)

より拡張機能を追加する。


### ユーザースクリプト版（Greasemonkey / Tampermonkey）
Firefox＋[Greasemonkey](https://addons.mozilla.org/ja/firefox/addon/greasemonkey/)、Google Chrome＋[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ja)、あるいは Opera＋[Tampermonkey](https://addons.opera.com/ja/extensions/details/tampermonkey-beta/?display=en)の環境で、  

> [Twitter 原寸ビュー(twOpenOriginalImage.user.js)](https://github.com/furyutei/twOpenOriginalImage/raw/master/src/js/twOpenOriginalImage.user.js)  
                                
をクリックし、指示に従ってインストール。  


必要であれば、  

> [Twitter 画像ダウンロードヘルパー(twImageDownloadHelper.user)](https://github.com/furyutei/twOpenOriginalImage/raw/master/src/js/twImageDownloadHelper.user.js)  

も同様にインストール。  


■ 使い方
---
Web 版公式 Twitter 上で、画像つきツイートには [原寸表示]（[Original]）というボタンが挿入される。  
これをクリックすると、オリジナルの画像（URLが'～:orig'のもの）が別タブ上に開く。  

画像ダウンロードヘルパーをインストールした場合には、画像を単体で開いた際に、[ダウンロード]（[Download]）ボタンが表示され、これをクリックすると当該画像がダウンロードされる（このとき、…….jpg:orig などは、……-orig.jpg に自動的に変換される）。  


■ オリジナル ( hogas ([@hogextend](https://twitter.com/hogextend/) ) 氏作成 )
---
- [hogashi/twitterOpenOriginalImage](https://github.com/hogashi/twitterOpenOriginalImage)  
- [GoogleChrome拡張機能「twitter画像原寸ボタン」ver. 2.0公開 - hogashi.*](http://hogashi.hatenablog.com/entry/2016/01/01/234632)  


■ オリジナルとの主な違い
---
- アイデアを拝借、元のソースコードを参照しつつ、基本的にはいちから作成（なのでオリジナルでは発生しない不具合もあるはず）。  
- ユーザースクリプト版には、オプション設定機能はなし。必要な場合、インストール後に手動でソース上のパラメータ（SHOW_IN_DETAIL_PAGE, SHOW_IN_TIMELINE, DISPLAY_ALL_IN_ONE_PAGE）変更（true ⇔ false）。  
- 画像を個別のタブではなく、一つのタブでまとめて開く（DISPLAY_ALL_IN_ONE_PAGE = true 時・[Alt]＋クリックで個別のタブで開く）。  
