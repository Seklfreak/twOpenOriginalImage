twOpenOriginalImage
===================
【twitter画像原寸ボタン(改)】
- License: The MIT license  
- Copyright (c) 2016 風柳(furyu)  
- 対象ブラウザ： Firefox（[Greasemonkey](https://addons.mozilla.org/ja/firefox/addon/greasemonkey/)が必要）、Google Chrome（[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ja)が必要）


■ インストール方法
---
[Greasemonkey](https://addons.mozilla.org/ja/firefox/addon/greasemonkey/)を入れたFirefox、もしくは[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ja)を入れたGoogle Chromeにて、  

> [twOpenOriginalImage.user.js](https://github.com/furyutei/twOpenOriginalImage/raw/master/twOpenOriginalImage.user.js)  

をクリックし、指示に従ってインストール。  


■ 使い方
---
Web 版公式 Twitter 上で、画像つきツイートには [Original] というボタンが挿入される。  
これをクリックすると、オリジナルの画像（URLが'～:orig'のもの）が別タブ上に開く。  


■ オリジナル ( hogas ([@hogextend](https://twitter.com/hogextend/) ) 氏作成 )
---
- [hogashi/twitterOpenOriginalImage](https://github.com/hogashi/twitterOpenOriginalImage)  
- [GoogleChrome拡張機能「twitter画像原寸ボタン」ver. 2.0公開 - hogashi.*](http://hogashi.hatenablog.com/entry/2016/01/01/234632)  


■ オリジナルとの主な違い
---
- アイデアを拝借、元のソースコードを参照しつつ、基本的にはいちから作成（なのでオリジナルでは発生しない不具合もあるはず）。  
- オプション設定機能はなし。必要な場合、インストール後に手動でソース上のパラメータ(SHOW_IN_DETAIL_PAGE, SHOW_IN_TIMELINE, DISPLAY_ALL_IN_ONE_PAGE)変更（true ⇔ false）。  
- 画像を個別のタブではなく、一つのタブでまとめて開く（DISPLAY_ALL_IN_ONE_PAGE = true 時・[Alt]＋クリックで個別のタブで開く）。  
