Twitter 原寸びゅー (twOpenOriginalImage)
========================================

- License: The MIT license  
- Copyright (c) 2016 風柳(furyu)  
- 対象ブラウザ： Google Chrome、Firefox、Opera

Web 版公式 Twitter 上の画像を、原寸（URLが '～:orig' のもの）で開くボタンを付けるスクリプト。  
画像のダウンロード支援スクリプト（ダウンロードされる拡張子を '～.jpg-orig' 等から、'～-orig.jpg' のように変換）もあり。  


■ インストール方法 
---
### Google Chrome 拡張機能版
Google Chrome、あるいは Opera＋[Download Chrome Extension](https://addons.opera.com/ja/extensions/details/download-chrome-extension-9/?display=en)の環境で、

> [Twitter 原寸びゅー](https://chrome.google.com/webstore/detail/twitter-%E5%8E%9F%E5%AF%B8%E3%81%B3%E3%82%85%E3%83%BC/bkpaljhmpehdbjkoahohlhkhlleaicel)

より拡張機能を追加する。  


### ユーザースクリプト版（Greasemonkey / Tampermonkey）
Firefox＋[Greasemonkey](https://addons.mozilla.org/ja/firefox/addon/greasemonkey/)、Google Chrome＋[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ja)、あるいは Opera＋[Tampermonkey](https://addons.opera.com/ja/extensions/details/tampermonkey-beta/?display=en)の環境で、  

> [Twitter 原寸びゅー(twOpenOriginalImage.user.js)](https://github.com/furyutei/twOpenOriginalImage/raw/master/src/js/twOpenOriginalImage.user.js)  
                                
をクリックし、指示に従ってインストール。  

※ 0.1.3.0 以降は、ダウンロードヘルパー機能も原寸びゅーに集約済み。これより前に画像ダウンロードヘルパーをインストールしていた場合、当該スクリプト（twImageDownloadHelper.user）は削除しておくこと。  


■ 使い方
---
Web 版公式 Twitter 上で、画像つきツイートには [原寸表示]（[Original]）というボタンが挿入される。  
これをクリックすると、オリジナルサイズの画像（URLが'～:orig'のもの）が表示される。  

画像ダウンロードヘルパーが有効な場合は、[ダウンロード]（[Download]）ボタンが表示され、これをクリックすると当該画像がダウンロードされる（このとき、…….jpg:orig などは、……-orig.jpg に自動的に変換される）。  

拡張機能版では、オプション設定機能あり。  
また、タイムラインの画像を右クリックしてコンテキストメニューを開き、[原寸画像を保存]を選べば、当該画像がダウンロードされる（このときも拡張子は自動的に変換される）。  


■ オリジナル ( hogas ([@hogextend](https://twitter.com/hogextend/) ) 氏作成 )
---
- [hogashi/twitterOpenOriginalImage](https://github.com/hogashi/twitterOpenOriginalImage)  
- [GoogleChrome拡張機能「twitter画像原寸ボタン」ver. 2.0公開 - hogashi.*](http://hogashi.hatenablog.com/entry/2016/01/01/234632)  


■ オリジナルとの主な違いなど
---
- アイデアを拝借、元のソースコードを参照しつつ、基本的にはいちから作成（なのでオリジナルでは発生しない不具合等もあるはず）。  
- デフォルト設定では、画像を個別のタブではなく、一つのタブ上でまとめて開く（DISPLAY_ALL_IN_ONE_PAGE = true 時・[Alt]＋クリックで個別のタブで開く）。  
- ユーザースクリプト版には、オプション設定機能はなし。必要な場合、インストール後に手動でソース上のパラメータ（SHOW_IN_DETAIL_PAGE, SHOW_IN_TIMELINE, DISPLAY_ALL_IN_ONE_PAGE, DISPLAY_OVERLAY, DOWNLOAD_HELPER_SCRIPT_IS_VALID）を変更すること（true ⇔ false）。  


■ 関連記事
---
- [Twitter 原寸びゅー：Twitterの原寸画像を開くGoogle Chrome拡張機能＆ユーザースクリプト公開 - 風柳メモ](http://furyu.hatenablog.com/entry/20160116/1452871567)  
