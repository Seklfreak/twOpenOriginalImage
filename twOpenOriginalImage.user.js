// ==UserScript==
// @name            twOpenOriginalImage
// @namespace       http://furyu.hatenablog.com/
// @author          furyu
// @version         0.1.0.1
// @include         http://twitter.com/*
// @include         https://twitter.com/*
// @description     Open images in original size on Twitter.
// ==/UserScript==
/*
※オリジナル： hogas (@hogextend) 氏作成
  [hogashi/twitterOpenOriginalImage](https://github.com/hogashi/twitterOpenOriginalImage)
  [GoogleChrome拡張機能「twitter画像原寸ボタン」ver. 2.0公開 - hogashi.*](http://hogashi.hatenablog.com/entry/2016/01/01/234632)
*/
/*
The MIT License (MIT)

Copyright (c) 2016 furyu <furyutei@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

( function ( w, d ) {

'use strict';

if ( ( w !== w.parent ) || ( w.twOpenOriginalImage_touched ) ) {
    return;
}
w.twOpenOriginalImage_touched = true;


// ■ パラメータ
var SHOW_IN_DETAIL_PAGE = true,
    SHOW_IN_TIMELINE = true,
    DISPLAY_ALL_IN_ONE_PAGE = true,
    WAIT_AFTER_OPENPAGE = 500; // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない


// 共通変数
var LANGUAGE = ( function () {
    try{
        return ( w.navigator.browserLanguage || w.navigator.language || w.navigator.userLanguage ).substr( 0, 2 );
    }
    catch ( error ) {
        return 'en';
    }
} )();

switch ( LANGUAGE ) {
    case 'ja' :
        var TITLE_PREFIX = '画像: ',
            TWEET_LINK_TEXT = '元ツイート',
            BUTTON_TEXT = 'Original',
            BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE = '全ての画像を同一ページで開く',
            BUTTON_HELP_DISPLAY_ONE_PER_PAGE = '画像を個別に開く';
        break;
    default:
        var TITLE_PREFIX = 'IMG: ',
            TWEET_LINK_TEXT = 'Tweet',
            BUTTON_TEXT = 'Original',
            BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE = 'Display all in one page',
            BUTTON_HELP_DISPLAY_ONE_PER_PAGE = 'Display one image per page';
        break;
}


function is_valid_url( url ) {
    if ( ! url ) {
        url = w.location.href;
    }
    
    if ( url.match( /\/([^/]+)\/status(?:es)?\/(\d+)/ ) ) {
        // 個別ページ
        if ( ! SHOW_IN_DETAIL_PAGE ) {
            return false;
        }
    }
    else {
        // タイムライン
        if ( ! SHOW_IN_TIMELINE ) {
            return false;
        }
    }
    return true;
} // end of is_valid_url()


var add_open_button = ( function () {
    var button_container_template = d.createElement( 'div' ),
        button = d.createElement( 'input' ),
        img_template = d.createElement( 'img' ),
        link_template = d.createElement( 'a' ),
        p_template = d.createElement( 'p' ),
        button_style = button.style,
        img_style = img_template.style,
        opened_name_map = {};
    
    button.type =  'button';
    button_style.width = '70px';
    if ( DISPLAY_ALL_IN_ONE_PAGE ) {
        button.title = '[Click]: ' + BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE + ' / [Alt]+[Click]: ' + BUTTON_HELP_DISPLAY_ONE_PER_PAGE;
    }
    else {
        button.title = '[Click]: ' + BUTTON_HELP_DISPLAY_ONE_PER_PAGE + ' / [Alt]+[Click]: ' + BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE;
    }
    button.value = BUTTON_TEXT;
    
    button_container_template.className = 'ProfileTweet-action twOpenOriginalImageButton';
    button_container_template.appendChild( button );
    
    img_style.maxWidth = '100%';
    img_style.height = 'auto';
    link_template.target = '_blank';
    
    function open_page( img_urls, tweet_url, title ) {
        var is_complete = false,
            child_window_name = '_blank';
        
        if ( tweet_url ) {
            // window名定義 (同一ツイートのページについては、複数開かないようにする)
            child_window_name = 'twOpenOriginalImage_' + tweet_url.replace(/^.*\/(\d+)$/, '$1' );
            if ( opened_name_map[ child_window_name ] ) {
                opened_name_map[ child_window_name ].close(); // 前面に出すため、同じ名前の window が開いていたら、一度閉じて開きなおす(※window.focus()ではタブは前面に出てこない)
                // TODO: Firefox(Greasemonkey) の場合には、これでも前面に出てこない場合有り(違うタブのタイムラインから、同一ツイートに対して操作した場合等)。
            }
        }
        var child_window = w.open( 'about:blank', child_window_name ),
            child_document = child_window.document;
        
        opened_name_map[ child_window_name ] = child_window;
        
        function page_onload() {
            if ( is_complete ) {
                return;
            }
            
            var child_document = child_window.document;
            
            try {
                child_document.open();
                child_document.write( '<head></head><body></body>' );
                child_document.close();
            }
            catch ( error ) {
                //console.error( error ); // Firefox 43.0.4 (Greasemonkey): SecurityError: The operation is insecure.
                // ※ Firefox(Greasemonkey) の場合、child_document.open() が SecurityError となってしまう
                //    また、load された時点で、既に '<head></head><body></body>' になっている模様
            }
            
            var head = child_document.querySelector( 'head' ),
                body = child_document.querySelector( 'body' ),
                title_node = child_document.createElement( 'title' );
            
            title_node.appendChild( child_document.createTextNode( TITLE_PREFIX ) );
            head.appendChild( title_node );
            
            if ( tweet_url ) {
                var link = child_document.importNode( link_template, true ),
                    p = child_document.importNode( p_template, true );
                
                link.href = tweet_url;
                link.appendChild( child_document.createTextNode( TWEET_LINK_TEXT ) );
                p.appendChild( link );
                body.appendChild( p );
            }
            if ( title ) {
                title_node.removeChild( title_node.firstChild );
                title_node.appendChild( child_document.createTextNode( TITLE_PREFIX + title ) );
            }
            img_urls.forEach( function ( img_url ) {
                var img = child_document.importNode( img_template, true ),
                    link = child_document.importNode( link_template, true ),
                    p = child_document.importNode( p_template, true );
                
                img.src = link.href = img_url;
                link.appendChild( img );
                p.appendChild( link );
                body.appendChild( p );
            } );
            
            child_window.focus();
            
            is_complete = true;
        }
        
        if ( 0 <= w.navigator.userAgent.toLowerCase().indexOf( 'firefox' ) ) {
            // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない
            
            // TODO: ページが load された後でも書き換えがうまくいかない場合がある
            // - 一瞬書き換え結果の表示がされた後、空の("<head></head><body></body>"だけの)HTMLになったり、titleだけが書き換わった状態になったりする
            // - 元のページが固まってしまう場合がある
            // - Firefoxを再起動すると解消されたりと、結果が安定しない
            //child_window.addEventListener( 'load', function ( event ) {
            //    page_onload();
            //}, false );
            
            setTimeout( function() {
                page_onload();
            }, WAIT_AFTER_OPENPAGE );
        }
        else {
            page_onload();
        }
        
    } // end of open_page()
    
    
    return function ( tweet ) {
        if ( tweet.querySelector( '.twOpenOriginalImageButton' ) ) {
            return;
        }
        
        var photo_container = tweet.querySelector( '.AdaptiveMedia-photoContainer, .AdaptiveMedia-container' ),
            action_list = tweet.querySelector( '.ProfileTweet-actionList' );
        
        if ( ( ! photo_container ) || ( ! action_list ) ) {
            return;
        }
        
        var img_urls = [];
        
        [].forEach.call( photo_container.querySelectorAll( 'img' ), function ( img ) {
            if ( img.src ) {
                var img_url = img.src.replace( /:\w*$/, '' ) + ':orig';
                
                img_urls.push( img_url );
            }
        } );
        if ( img_urls.length <= 0 ) {
            return false;
        }
        
        var button_container = button_container_template.cloneNode( true ),
            button = button_container.querySelector( 'input[type="button"]' );
        
        button.addEventListener( 'click', function ( event ) {
            event.stopPropagation();
            
            if ( DISPLAY_ALL_IN_ONE_PAGE ^ event.altKey ) {
                var tweet_url = tweet.getAttribute( 'data-permalink-path' ),
                    tweet_text = tweet.querySelector( '.tweet-text' ),
                    title;
                
                if ( tweet_text ) {
                    title = tweet_text.textContent;
                }
                open_page( img_urls, tweet_url, title );
            }
            else {
                img_urls.reverse();
                img_urls.forEach( function ( img_url ) {
                    w.open( img_url, '_blank' );
                } );
            }
            return false;
        }, false );
        
        action_list.appendChild( button_container );
        
        return button_container;
    };
} )(); // end of add_open_button()


function check_tweets( node ) {
    if ( ( ! node ) || ( node.nodeType != 1 ) ) {
        return;
    }
    
    var tweet_list = Array.apply( null, node.querySelectorAll( 'div.js-stream-tweet, div.tweet' ) );
    
    if ( node.tagName == 'DIV' && (' ' + node.className + ' ').match( /(?: js-stream-tweet | tweet )/ ) ) {
        tweet_list.push( node );
    }
    
    tweet_list.forEach( function ( tweet ) {
        add_open_button( tweet );
    } );
} // end of check_tweets()


// 新規に挿入されるツイートの監視
new MutationObserver( function ( records ) {
    if ( ! is_valid_url() ) { // ※ History API によりページ遷移無しで移動する場合もあるので毎回チェック
        return;
    }
    
    records.forEach( function ( record ) {
        [].forEach.call( record.addedNodes, function ( addedNode ) {
            check_tweets( addedNode );
        } );
    } );
} ).observe( d.body, { childList : true, subtree : true } );


// 最初に表示されているすべてのツイートをチェック
if ( is_valid_url() ) {
    check_tweets( d.body );
}

} )( window, document );

// ■ end of file
