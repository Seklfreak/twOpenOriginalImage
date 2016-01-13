// ==UserScript==
// @name            twOpenOriginalImage
// @namespace       http://furyu.hatenablog.com/
// @author          furyu
// @version         0.1.0.0
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

Copyright (c) 2015 furyu <furyutei@gmail.com>

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
    TITLE_PREFIX = 'Image(s): ',
    TWEET_LINK_TEXT = 'Tweet',
    WAIT_AFTER_OPENPAGE = 500; // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない


function check_url() {
    if ( w.location.href.match( /\/([^/]+)\/status(?:es)?\/(\d+)/ ) ) {
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
} // end of check_url()


var add_open_button = ( function () {
    var button_container_template = d.createElement( 'div' ),
        button = d.createElement( 'input' ),
        img_template = d.createElement( 'img' ),
        link_template = d.createElement( 'a' ),
        p_template = d.createElement( 'p' ),
        button_style = button.style,
        img_style = img_template.style;
    
    button.setAttribute( 'type', 'button' );
    button.setAttribute( 'value', 'Original' );
    button_style.width = '70px';
    button_container_template.className = 'ProfileTweet-action twOpenOriginalImageButton';
    button_container_template.appendChild( button );
    
    img_style.maxWidth = '100%';
    img_style.height = 'auto';
    link_template.setAttribute( 'target', '_blank' );
    
    function open_page( img_urls, tweet_url, title ) {
        var child_window = w.open( 'about:blank', '_blank' ),
            child_document = child_window.document;
        
        function page_onload() {
            var child_document = child_window.document,
                head = child_document.querySelector( 'head' ),
                body = child_document.querySelector( 'body' ),
                title_node;
            
            if ( ( ! head ) || ( ! body ) ) {
                child_document.open();
                child_document.write( '<head></head><body></body>' );
                child_document.close();
                head = child_document.querySelector( 'head' );
                body = child_document.querySelector( 'body' );
            }
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
        }
        
        try {
            child_document.open();
            child_document.write( '<head></head><body></body>' );
            child_document.close();
            page_onload();
        } catch ( error ) {
             // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない
            //console.error( error ); // Firefox 43.0.4 (Greasemonkey): SecurityError: The operation is insecure.
            child_window.addEventListener( 'load', function ( event ) {
                //page_onload(); // ページが load されたタイミングでも、まだうまくいかない
                setTimeout( function() {
                    page_onload();
                }, WAIT_AFTER_OPENPAGE );
            }, false );
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
        
        var button_container = button_container_template.cloneNode( true );
        
        button_container.addEventListener( 'click', function ( event ) {
            event.stopPropagation();
            
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
            
            if ( DISPLAY_ALL_IN_ONE_PAGE ) {
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
                    w.open( img_url );
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
    if ( ! check_url() ) { // ※ History API によりページ遷移無しで移動する場合もあるので毎回チェック
        return;
    }
    records.forEach( function ( record ) {
        [].forEach.call( record.addedNodes, function ( addedNode ) {
            check_tweets( addedNode );
        } );
    } );
} ).observe( d.body, { childList : true, subtree : true } );


// 最初に表示されているすべてのツイートをチェック
if ( check_url() ) {
    check_tweets( d.body );
}

} )( window, document );

// ■ end of file
