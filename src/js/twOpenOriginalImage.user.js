// ==UserScript==
// @name            twOpenOriginalImage
// @namespace       http://furyu.hatenablog.com/
// @author          furyu
// @version         0.1.4.13
// @include         http://twitter.com/*
// @include         https://twitter.com/*
// @include         https://pbs.twimg.com/media/*
// @description     Open images in original size on Twitter.
// ==/UserScript==
/*
[furyutei/twOpenOriginalImage](https://github.com/furyutei/twOpenOriginalImage)
[Twitter 原寸びゅー：Twitterの原寸画像を開くGoogle Chrome拡張機能＆ユーザースクリプト公開 - 風柳メモ](http://furyu.hatenablog.com/entry/20160116/1452871567)

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

var SCRIPT_NAME = 'twOpenOriginalImage';

if ( w[SCRIPT_NAME + '_touched'] ) {
    return;
}
w[ SCRIPT_NAME + '_touched' ] = true;


// ■ パラメータ
var OPTIONS = {
    SHOW_IN_DETAIL_PAGE : true // true: 詳細ページで動作
,   SHOW_IN_TIMELINE : true // true: タイムラインで動作
,   DISPLAY_ALL_IN_ONE_PAGE : true // true: [Click] 全ての画像を同一ページで開く / [Alt]+[Click] 画像を個別に開く、false: 左記の逆の動作
,   DISPLAY_OVERLAY : true // true: 全ての画像を同一ページで開く際に(別タブで開かず)タイムライン上にオーバーレイする
,   OVERRIDE_CLICK_EVENT : true // true: ツイート中の画像クリックで原寸画像を開く
,   DOWNLOAD_HELPER_SCRIPT_IS_VALID : true // true: ダウンロードヘルパー機能有効
,   OPERATION : true // true: 動作中、false: 停止中
,   WAIT_AFTER_OPENPAGE : 500 // Firefox でページを開いた後、画像を挿入するまでのタイムラグ(ms)
    // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない
,   KEYCODE_DISPLAY_IMAGES : 118 // 画像を開くときのキー(118=[v])
,   KEYCODE_CLOSE_OVERLAY : 27 // 画像を閉じるときのキー(※オーバーレイ時のみ)
,   HELP_KEYCHAR_DISPLAY_IMAGES : 'v'
};


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
        OPTIONS.TITLE_PREFIX = '画像: ';
        OPTIONS.TWEET_LINK_TEXT = '元ツイート⤴';
        OPTIONS.CLOSE_TEXT = '☒ 閉じる';
        OPTIONS.BUTTON_TEXT = '原寸画像';
        OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE = '全ての画像を同一ページで開く';
        OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE = '画像を個別に開く';
        OPTIONS.DOWNLOAD_HELPER_BUTTON_TEXT = '↓ ダウンロード';
        OPTIONS.HELP_KEYPRESS_DISPLAY_IMAGES = '原寸画像を開く 【原寸びゅー】';
        break;
    default:
        OPTIONS.TITLE_PREFIX = 'IMG: ';
        OPTIONS.TWEET_LINK_TEXT = 'Tweet';
        OPTIONS.CLOSE_TEXT = 'Close';
        OPTIONS.BUTTON_TEXT = 'Original';
        OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE = 'Display all in one page';
        OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE = 'Display one image per page';
        OPTIONS.DOWNLOAD_HELPER_BUTTON_TEXT = 'Download';
        OPTIONS.HELP_KEYPRESS_DISPLAY_IMAGES = 'Display original images (' + SCRIPT_NAME + ')';
        break;
}


function is_firefox() {
    return ( 0 <= w.navigator.userAgent.toLowerCase().indexOf( 'firefox' ) );
} // end of is_firefox()


function is_ie() {
    return ( !! ( w.navigator.userAgent.toLowerCase().match( /(?:msie|trident)/ ) ) );
} // end of is_ie()


function is_bookmarklet() {
    return ( !! ( w.jQuery ) ); // jQuery が参照可能→ブックマークレットから起動しているとみなす
} // end of is_bookmarklet()


function import_node( node, doc ) {
    if ( ! doc ) {
        doc = d;
    }
    if ( doc === d ) {
        return node.cloneNode( true );
    }
    try {
        return doc.importNode( node, true );
    }
    catch ( error ) {
        var source_container = d.createElement( 'div' ),
            target_container = doc.createElement( 'div' );
        
        source_container.appendChild( node );
        target_container.innerHTML = source_container.innerHTML;
        source_container.removeChild( node );
        
        var imported_node = target_container.removeChild( target_container.firstChild );
        
        return imported_node;
    }
} // end of import_node()


function clear_node( node ) {
    while ( node.firstChild ) {
        node.removeChild( node.firstChild );
    }
} // end of clear_node()


var create_download_link = ( function () {
    var link_template = d.createElement( 'a' ),
        link_style = link_template.style;
    
    link_style.display = 'inline-block';
    link_style.fontWeight = 'normal';
    link_style.fontSize = '12px';
    link_style.color = 'gray';
    link_style.background = '#fff';
    link_style.textDecoration = 'none';
    link_style.margin = '0';
    link_style.padding = '4px 8px';
    link_style.border = 'solid 2px #e1e8ed';
    link_style.borderRadius = '3px';
    
    function create_download_link( img_url, doc ) {
        if ( ! doc ) {
            doc = d;
        }
        
        var link = import_node( link_template, doc ),
            link_style = link.style;
        
        link.addEventListener( 'mouseover', function ( event ) {
            link_style.borderColor = 'red';
        } );
        
        link.addEventListener( 'mouseout', function ( event ) {
            link_style.borderColor = '#e1e8ed';
        } );
        
        link.appendChild( doc.createTextNode( OPTIONS.DOWNLOAD_HELPER_BUTTON_TEXT ) );
        
        if ( img_url ) {
            var filename = img_url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '$1-$3.$2' );
            
            link.href = img_url;
            link.download = filename;
        }
        return link;
    }
    
    return create_download_link;
} )(); // end of create_download_link()


function initialize_download_helper() {
    if ( ! ( w.location.href.match( /^https?:\/\/pbs\.twimg\.com\/media\// ) ) ) {
        return false;
    }
    
    if ( ( ! OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID ) || ( is_ie() ) ) {
        return true;
    }
    
    var img_url = w.location.href,
        link = create_download_link( img_url );
    
    if ( w.name == SCRIPT_NAME + '_download_frame' ) {
        // 本スクリプトによりダウンロード用 IFRAME 経由で開いた場合
        d.documentElement.appendChild( link );
        link.click(); // ダウンロード開始
        return true;
    }
    
    // 通常の window(top) として開いた場合、もしくは本スクリプトにより window.open() で開いた場合
    var link_container = d.createElement( 'div' ),
        link_container_style = link_container.style;
    
    link_container_style.margin = '2px 0 1px 0';
    link_container.appendChild( link );
    d.body.insertBefore( link_container, d.body.firstChild );
    
    return true;
} // end of initialize_download_helper()


function initialize( user_options ) {
    if ( user_options ) {
        Object.keys( user_options ).forEach( function ( name ) {
            if ( user_options[ name ] === null ) {
                return;
            }
            OPTIONS[ name ] = user_options[ name ];
        } );
    }
    
    if ( ! OPTIONS.OPERATION ) {
        return;
    }
    
    if ( initialize_download_helper() !== false ) {
        return;
    }
    
    if ( w !== parent ) {
        return;
    }
    
    var escape_html = ( function () {
        var escape_map = {
                '&' : '&amp;'
            ,   '"' : '&quot;'
            ,   '\'' : '&#39;'
            ,   '<' : '&lt;'
            ,   '>' : '&gt;'
            },
            re_escape = /[&"'<>]/g;
        
        function escape_char( char ) {
            if ( ! ( escape_map.hasOwnProperty( char ) ) ) {
                return char;
            }
            return escape_map[ char ];
        }
        
        function escape_html( html ) {
            return String( html ).replace( re_escape, escape_char );
        }
        
        return escape_html;
    } )(); // end of escape_html()
    
    
    function to_array( array_like_object ) {
        return Array.apply( null, array_like_object );
    } // end of to_array()
    
    
    function is_valid_url( url ) {
        if ( ! url ) {
            url = w.location.href;
        }
        
        if ( url.match( /\/([^/]+)\/status(?:es)?\/(\d+)/ ) ) {
            // 個別ページ
            if ( ! OPTIONS.SHOW_IN_DETAIL_PAGE ) {
                return false;
            }
        }
        else {
            // タイムライン
            if ( ! OPTIONS.SHOW_IN_TIMELINE ) {
                return false;
            }
        }
        return true;
    } // end of is_valid_url()
    
    
    function get_scroll_top( doc ) {
        if ( ! doc ) {
            doc = d;
        }
        return ( doc.body.scrollTop || doc.documentElement.scrollTop );
    } // end of get_scroll_top()
    
    
    function get_element_top( element, win ) {
        if ( ! win ) {
            win = w;
        }
        return element.getBoundingClientRect().top + w.pageYOffset;
    } // end of get_element_top()
    
    
    var add_open_button = ( function () {
        var header_template = d.createElement( 'h1' ),
            button_container_template = d.createElement( 'div' ),
            button = d.createElement( 'input' ),
            link_template = d.createElement( 'a' ),
            img_template = d.createElement( 'img' ),
            img_link_container_template = d.createElement( 'div' ),
            download_link_container_template = d.createElement( 'div' ),
            download_frame_template = d.createElement( 'iframe' ),
            page_container = d.querySelector( 'div#page-container' ),
            image_overlay_container = d.createElement( 'div' ),
            image_container = d.createElement( 'div' ),
            
            header_style = header_template.style,
            button_style = button.style,
            link_style = link_template.style,
            img_style = img_template.style,
            img_link_container_style = img_link_container_template.style,
            download_link_container_style = download_link_container_template.style,
            download_frame_style = download_frame_template.style,
            image_overlay_container_style = image_overlay_container.style,
            image_container_style = image_container.style,
            
            button_container_classname = SCRIPT_NAME + 'Button',
            opened_name_map = {},
            is_mac = ( 0 <= w.navigator.platform.toLowerCase().indexOf( 'mac' ) ),
            alt_text = ( is_mac ) ? '[option]' : '[Alt]';
        
        header_style.fontSize = '16px';
        header_style.margin = '0 0 8px';
        header_style.padding = '8px 8px 4px';
        
        button.type =  'button';
        button_style.padding = '2px 6px';
        button_style.color = 'gray';
        if ( OPTIONS.DISPLAY_ALL_IN_ONE_PAGE ) {
            button.title = escape_html( '[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE + ' / ' + alt_text + '+[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE );
        }
        else {
            button.title = escape_html( '[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE + ' / ' + alt_text + '+[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE );
        }
        button.value = escape_html( OPTIONS.BUTTON_TEXT );
        button_container_template.className = 'ProfileTweet-action ' + button_container_classname;
        button_container_template.appendChild( button );
        
        link_template.target = '_blank';
        link_style.textDecoration = 'none';
        link_style.color = '#66757f';
        
        img_style.maxWidth = '100%';
        img_style.height = 'auto';
        img_style.background = '#fff';
        img_link_container_style.clear = 'both';
        img_link_container_style.margin = '0 0 8px 0';
        img_link_container_style.textAlign = 'center';
        
        download_link_container_style.margin = '0 0 1px 0';
        
        download_frame_template.name = SCRIPT_NAME + '_download_frame';
        download_frame_style.width = '0';
        download_frame_style.height = '0';
        download_frame_style.visibility = 'hidden';
        
        image_overlay_container.id = SCRIPT_NAME + '_image_overlay_container';
        image_overlay_container_style.display = 'none';
        image_overlay_container_style.position = 'absolute';
        image_overlay_container_style.top = 0;
        image_overlay_container_style.left = 0;
        image_overlay_container_style.width = '100%';
        image_overlay_container_style.height = 'auto';
        image_overlay_container_style.zIndex = 10000;
        image_overlay_container_style.padding = '0';
        image_overlay_container_style.background = 'rgba( 0, 0, 0, 0.8 )';
        
        image_container.className = SCRIPT_NAME + '_image_container';
        image_container_style.width = '100%';
        image_container_style.height = 'auto';
        image_container_style.marginTop = '26px';
        
        image_overlay_container.appendChild( image_container );
        
        d.body.appendChild( image_overlay_container );
        
        function add_images_to_page( img_urls, parent, target_document ) {
            if ( ! target_document ) {
                target_document = d;
            }
            img_urls.forEach( function ( img_url ) {
                var img = import_node( img_template, target_document ),
                    link = import_node( link_template, target_document ),
                    img_link_container = import_node( img_link_container_template, target_document );
                
                if ( OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID && ( ! is_ie() ) ) {
                    var download_link = create_download_link( img_url, target_document ),
                        download_link_container = import_node( download_link_container_template, target_document );
                    
                    download_link.href = img_url;
                    
                    if ( is_bookmarklet() ) {
                        download_link.addEventListener( 'click', function ( event ) {
                            event.stopPropagation();
                        }, false );
                    }
                    else {
                        download_link.addEventListener( 'click', function ( event ) {
                            event.stopPropagation();
                            event.preventDefault();
                            
                            var old_iframe = target_document.querySelector( 'iframe[name="' + SCRIPT_NAME + '_download_frame' + '"]' ),
                                iframe = import_node( download_frame_template, target_document );
                            
                            if ( old_iframe ) {
                                target_document.documentElement.removeChild( old_iframe );
                            }
                            iframe.src = img_url;
                            target_document.documentElement.appendChild( iframe );
                            
                            return false;
                        }, false );
                    }
                    download_link_container.appendChild( download_link );
                    img_link_container.appendChild( download_link_container );
                }
                
                img.src = link.href = img_url;
                link.appendChild( img );
                link.addEventListener( 'click', function ( event ) {
                    event.stopPropagation();
                }, false );
                
                img_link_container.appendChild( link );
                
                parent.appendChild( img_link_container );
            } );
        } // end of add_images_to_page()
        
        
        function show_overlay( img_urls, tweet_url, title ) {
            if ( image_overlay_container_style.display != 'none' ) {
                // TODO: 重複して呼ばれるケース(不正な動作)に対するガード
                //console.error( 'show_overlay(): duplicate called' );
                return;
            }
            
            var body = d.body,
                doc = d.querySelector( 'div#doc' ),
                gallery = d.querySelector( 'div.Gallery' ),
                gallery_overlay = d.querySelector( 'div.gallery-overlay' ),
                permalink_overlay = d.querySelector( 'div#permalink-overlay' ),
                close_link = import_node( link_template ),
                header = import_node( header_template ),
                
                body_style = body.style,
                doc_style = doc.style,
                gallery_style = ( gallery ) ? gallery.style : null,
                gallery_overlay_style = ( gallery_overlay ) ? gallery_overlay.style : null,
                permalink_overlay_style = ( permalink_overlay ) ? permalink_overlay.style : null,
                close_link_style = close_link.style,
                header_style = header.style,
                
                saved_scrollTop = get_scroll_top(),
                
                saved_body_position = body_style.position,
                saved_body_overflow = body_style.overflow,
                saved_body_marginRight = body_style.marginRight,
                saved_doc_overflow = doc_style.overflow,
                saved_doc_height = doc_style.height,
                saved_doc_marginTop = doc_style.marginTop;
            
            function update_image_overlay_container_height( event ) {
                var height = Math.max( image_container.offsetHeight + 64, w.innerHeight + get_scroll_top() );
                
                doc_style.height = ( height + saved_scrollTop ) + 'px';
                image_overlay_container_style.height = height + 'px';
            } // end of update_image_overlay_container_height()
            
            
            function close_image_overlay_container( event ) {
                event.stopPropagation();
                event.preventDefault();
                
                image_overlay_container_style.display = 'none';
                
                w.removeEventListener( 'resize', update_image_overlay_container_height, false );
                w.removeEventListener( 'scroll', update_image_overlay_container_height, false );
                
                image_overlay_container.removeEventListener( 'click', close_image_overlay_container, false );
                close_link.removeEventListener( 'click', close_image_overlay_container, false );
                
                clear_node( image_container );
                
                doc_style.height = saved_doc_height;
                doc_style.marginTop = saved_doc_marginTop;
                doc_style.overflow = saved_doc_overflow;
                
                body_style.marginRight = saved_body_marginRight;
                body_style.overflow = saved_body_overflow;
                body_style.position = saved_body_position;
                
                w.scrollTo( 0, saved_scrollTop );
                
                return false;
            } // end of close_image_overlay_container()
            
            
            clear_node( image_container );
            
            close_link.className = SCRIPT_NAME + '_close_overlay';
            close_link.href = tweet_url;
            close_link.appendChild( d.createTextNode( OPTIONS.CLOSE_TEXT ) );
            //header_style.cssFloat = 'right';
            header_style.position = 'fixed';
            header_style.top = '0';
            header_style.right = '0';
            header_style.width = '100%';
            header_style.textAlign = 'right';
            header_style.background = 'white';
            header_style.borderBottom = 'solid 1px silver';
            header.appendChild( close_link );
            
            image_container.appendChild( header );
            
            add_images_to_page( img_urls, image_container );
            
            body_style.position = 'static';
            body_style.overflow = 'auto';
            body_style.marginRight = '0';
            
            doc_style.overflow = 'hidden';
            doc_style.marginTop = -saved_scrollTop + 'px';
            update_image_overlay_container_height();
            
            image_overlay_container_style.display = 'block';
            
            close_link.addEventListener( 'click', close_image_overlay_container, false );
            image_overlay_container.addEventListener( 'click', close_image_overlay_container, false );
            
            w.addEventListener( 'scroll', update_image_overlay_container_height, false );
            w.addEventListener( 'resize', update_image_overlay_container_height, false );
            
            w.scrollTo( 0, 0 );
            
        } // end of show_overlay()
        
        
        function open_page( img_urls, tweet_url, title ) {
            var is_complete = false,
                child_window_name = '_blank';
            
            if ( tweet_url ) {
                // window名定義 (同一ツイートのページについては、複数開かないようにする)
                child_window_name = SCRIPT_NAME + '_' + tweet_url.replace(/^.*\/(\d+)$/, '$1' );
                
                if ( opened_name_map[ child_window_name ] ) {
                    opened_name_map[ child_window_name ].close(); // 前面に出すため、同じ名前の window が開いていたら、一度閉じて開きなおす(※ window.focus()ではタブは前面に出てこない)
                    // TODO: Firefox(Greasemonkey) の場合には、これでも前面に出てこない場合有り(違うタブのタイムラインから、同一ツイートに対して操作した場合等)
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
                    title_node = child_document.createElement( 'title' ),
                    title_text = OPTIONS.TITLE_PREFIX + ( ( title ) ? title : '' );
                
                body.style.background = '#f5f8fa';
                
                clear_node( title_node );
                title_node.appendChild( child_document.createTextNode( title_text ) );
                head.appendChild( title_node );
                
                if ( tweet_url ) {
                    var link = import_node( link_template, child_document ),
                        header = import_node( header_template, child_document );
                    
                    link.href = tweet_url;
                    link.appendChild( child_document.createTextNode( OPTIONS.TWEET_LINK_TEXT ) );
                    header.style.cssFloat = 'right';
                    header.appendChild( link );
                    body.appendChild( header );
                }
                
                add_images_to_page( img_urls, body, child_document );
                
                child_window.focus();
                
                is_complete = true;
            }
            
            if ( is_firefox() ) {
                // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない
                
                // TODO: ページが load された後でも書き換えがうまくいかない場合がある
                // - 一瞬書き換え結果の表示がされた後、空の("<head></head><body></body>"だけの)HTMLになったり、titleだけが書き換わった状態になったりする
                // - 元のページが固まってしまう場合がある
                // - Firefoxを再起動すると解消されたりと、結果が安定しない
                //child_window.addEventListener( 'load', function ( event ) {
                //    page_onload();
                //}, false );
                
                setTimeout( function () {
                    page_onload();
                }, OPTIONS.WAIT_AFTER_OPENPAGE );
            }
            else {
                page_onload();
            }
            
        } // end of open_page()
        
        
        function add_open_button( tweet ) {
            if ( tweet.querySelector( '.' + button_container_classname ) ) {
                return null;
            }
            
            var gallery = ( function ( check_node, gallery ) {
                    while ( check_node && ( check_node.nodeType == 1 ) ) {
                        if ( check_node.classList.contains( 'Gallery' ) ) {
                            gallery = check_node;
                            break;
                        }
                        check_node = check_node.parentNode;
                    }
                    return gallery;
                } )( tweet.parentNode ),
                gallery_media = ( gallery ) ? gallery.querySelector( '.Gallery-media' ) : null,
                img_objects = ( gallery_media ) ? gallery_media.querySelectorAll( 'img.media-image' ) : null,
                img_objects = ( img_objects ) ? img_objects : tweet.querySelectorAll( '.AdaptiveMedia-photoContainer img' ),
                action_list = tweet.querySelector( '.ProfileTweet-actionList' );
            
            if ( ( img_objects.length <= 0 ) || ( ! action_list ) ) {
                return null;
            }
            
            var img_urls = [];
            
            to_array( img_objects ).forEach( function ( img ) {
                if ( img.src ) {
                    var img_url = img.src.replace( /:\w*$/, '' ) + ':orig';
                    
                    img_urls.push( img_url );
                }
            } );
            
            if ( img_urls.length <= 0 ) {
                return null;
            }
            
            var button_container = button_container_template.cloneNode( true ),
                button = button_container.querySelector( 'input[type="button"]' );
            
            button.addEventListener( 'click', function ( event ) {
                event.stopPropagation();
                
                var target_img_url = button.getAttribute( 'data-target-img-url' ),
                    target_img_urls = ( target_img_url ) ? [ target_img_url ] : img_urls.slice( 0 );
                
                button.removeAttribute( 'data-target-img-url' );
                
                if ( OPTIONS.DISPLAY_ALL_IN_ONE_PAGE ^ event.altKey ) {
                    var tweet_url = tweet.getAttribute( 'data-permalink-path' ),
                        tweet_text = tweet.querySelector( '.tweet-text' ),
                        title;
                    
                    if ( tweet_text ) {
                        title = tweet_text.textContent;
                    }
                    if ( OPTIONS.DISPLAY_OVERLAY ) {
                        show_overlay( target_img_urls, tweet_url, title );
                    }
                    else {
                        open_page( target_img_urls, tweet_url, title );
                    }
                }
                else {
                    target_img_urls.reverse();
                    target_img_urls.forEach( function ( img_url ) {
                        w.open( img_url, '_blank' );
                    } );
                }
                return false;
            }, false );
            
            action_list.appendChild( button_container );
            
            if ( OPTIONS.OVERRIDE_CLICK_EVENT ) {
                if ( gallery_media ) {
                    // TODO: ナビが覆いかぶさっている(z-index:1)ため、手前に出して画像クリックイベントの方を優先化しているが、もっとスマートな方法は無いか？
                    gallery_media.style.zIndex = 10;
                    gallery_media.style.pointerEvents = 'none';
                }
                
                to_array( img_objects ).forEach( function ( img ) {
                    if ( img.classList.contains( SCRIPT_NAME + '_touched' ) ) {
                        return;
                    }
                    
                    img.addEventListener( 'click', function ( event ) {
                        event.stopPropagation();
                        event.preventDefault();
                        if ( img.src ) {
                            button.setAttribute( 'data-target-img-url', img.src.replace( /:\w*$/, '' ) + ':orig' );
                            button.click();
                        }
                        
                        return false;
                    }, false );
                    
                    if ( img.classList.contains( 'media-image' ) ) {
                        img.style.pointerEvents = 'auto';
                    }
                    
                    img.classList.add( SCRIPT_NAME + '_touched' );
                } );
            }
            return button_container;
        } // end of add_open_button()
        
        return add_open_button;
    } )(); // end of add_open_button()
    
    
    function check_tweets( node ) {
        if ( ( ! node ) || ( node.nodeType != 1 ) ) {
            return false;
        }
        
        var tweet_list = to_array( node.querySelectorAll( 'div.js-stream-tweet, div.tweet' ) );
        
        if ( node.tagName == 'DIV' && ( ' ' + node.className + ' ' ).match( /(?: js-stream-tweet | tweet )/ ) ) {
            tweet_list.push( node );
        }
        
        tweet_list.forEach( function ( tweet ) {
            add_open_button( tweet );
        } );
        
        if ( tweet_list.length <= 0 ) {
            return false;
        }
        return true;
    } // end of check_tweets()
    
    
    function check_help_dialog( node ) {
        if ( ( ! node ) || ( node.nodeType != 1 ) ) {
            return false;
        }
        var help_dialog = ( node.getAttribute( 'id' ) == 'keyboard-shortcut-dialog' ) ? node : node.querySelector( 'keyboard-shortcut-dialog' );
        if ( ( ! help_dialog ) || ( help_dialog.querySelector( 'tr.' + SCRIPT_NAME + '_key_help' ) ) ) {
            return false;
        }
        
        var modal_table_tbody = help_dialog.querySelector( 'table.modal-table tbody' ),
            tr_template = modal_table_tbody.querySelectorAll( 'tr' )[0],
            tr = tr_template.cloneNode( true ),
            shortcut_key = tr.querySelector( '.shortcut .sc-key' ),
            shortcut_label = tr.querySelector( '.shortcut-label' );
        
        tr.classList.add( SCRIPT_NAME + '_key_help' );
        
        clear_node( shortcut_key );
        clear_node( shortcut_label );
        
        shortcut_key.appendChild( d.createTextNode( OPTIONS.HELP_KEYCHAR_DISPLAY_IMAGES ) );
        shortcut_label.appendChild( d.createTextNode( OPTIONS.HELP_KEYPRESS_DISPLAY_IMAGES ) );
        
        modal_table_tbody.appendChild( tr );
        
        return true;
    } // end of check_help_dialog()
    
    
    function start_inserted_node_observer() {
        new MutationObserver( function ( records ) {
            if ( ! is_valid_url() ) { // ※ History API によりページ遷移無しで移動する場合もあるので毎回チェック
                return;
            }
            
            records.forEach( function ( record ) {
                to_array( record.addedNodes ).forEach( function ( addedNode ) {
                    if ( check_tweets( addedNode ) ) {
                        return;
                    }
                    if ( check_help_dialog( addedNode ) ) {
                        return;
                    }
                } );
            } );
        } ).observe( d.body, { childList : true, subtree : true } );
        
    } // end of start_inserted_node_observer()
    
    
    function close_overlay() {
        var image_overlay_container = d.querySelector( 'div#' + SCRIPT_NAME + '_image_overlay_container' ),
            close_link = ( image_overlay_container ) ? image_overlay_container.querySelector( 'a.' + SCRIPT_NAME + '_close_overlay' ) : null;
        
        if ( ( ! image_overlay_container )  || ( image_overlay_container.style.display == 'none' ) || ( ! close_link ) ) {
            return false;
        }
        
        close_link.click();
        
        return true;
    } // end of close_overlay()
    
    
    function view_images_on_keypress( event ) {
        if ( close_overlay() ) {
            event.stopPropagation();
            event.preventDefault();
            
            return false;
        }
        
        function get_button( target_tweet ) {
            return ( target_tweet ) ? target_tweet.querySelector( '.' + SCRIPT_NAME + 'Button input[type="button"]' ) : null;
        } // end of get_button()
        
        var gallery = d.querySelector( '.Gallery' ),
            target_tweet = ( gallery && w.getComputedStyle( gallery ).display != 'none' ) ? gallery.querySelector( 'div.js-stream-tweet, div.tweet' ) : null,
            button = get_button( target_tweet );
        
        if ( ( ! target_tweet ) || ( ! button ) ) {
            target_tweet = d.querySelector( '.selected-stream-item div.js-stream-tweet, .selected-stream-item div.tweet' );
            button = get_button( target_tweet );
        }
        if ( ( ! target_tweet ) || ( ! button ) ) {
            target_tweet = d.querySelector( '.permalink-tweet' );
            button = get_button( target_tweet );
        }
        if ( ( ! target_tweet ) || ( ! button ) ) {
            return;
        }
        
        event.stopPropagation();
        event.preventDefault();
        
        button.click();
        
        return false;
    } // end of view_images_on_keypress()
    
    
    function close_overview_on_keypress( event ) {
        if ( ! close_overlay() ) {
            return;
        }
        
        event.stopPropagation();
        event.preventDefault();
        
        return false;
    } // end of close_overview_on_keypress()
    
    
    function start_key_observer() {
        function is_valid( active_element ) {
            if ( 
                ( ( active_element.getAttribute( 'name' ) == 'tweet' ) && ( active_element.getAttribute( 'contenteditable' ) == 'true' ) ) ||
                ( active_element.tagName == 'TEXTAREA' ) ||
                ( ( active_element.tagName == 'INPUT' ) && ( active_element.getAttribute( 'type' ).toUpperCase() == 'TEXT' ) )
            ) {
                return false;
            }
            return true;
        } // end of is_valid()
        
        
        d.body.addEventListener( 'keypress', function ( event ) {
            var active_element = d.activeElement;
            
            if ( ! is_valid( active_element ) ) {
                return;
            }
            
            var key_code = event.which;
            
            switch ( key_code ) {
                case OPTIONS.KEYCODE_DISPLAY_IMAGES :
                    return view_images_on_keypress( event );
                    break;
                default :
                    break;
            }
        }, false );
        
        
        d.body.addEventListener( 'keydown', function ( event ) {
            var active_element = d.activeElement;
            
            if ( ! is_valid( active_element ) ) {
                return;
            }
            
            var key_code = event.keyCode;
            
            switch ( key_code ) {
                case OPTIONS.KEYCODE_CLOSE_OVERLAY :
                    return close_overview_on_keypress( event );
                    break;
                default :
                    break;
            }
        }, false );
        
    } // end of start_key_observer()
    
    
    function start_mouse_observer() {
        function check_obstacling_node( node ) {
            if ( ( ! node ) || ( node.nodeType != 1 ) ) {
                return;
            }
            if ( node.classList.contains( 'GalleryNav' ) || node.classList.contains( 'media-overlay' ) ) {
                // ギャラリー表示等の際にナビが画像にかぶさっており、コンテキストメニューから画像を保存できない場合がある
                // → コンテキストメニューを表示する際に少しの時間だけナビを隠すことで対応
                //    ※ Google Chrome 48.0.2564.97 m と Opera 34.0.2036.50 は OK、Firefox 44.0 はNG
                //       Firefox ではおそらく、スクリプトがイベントを処理するよりも、コンテキストメニューが開く方が早い
                var original_style_display = node.style.display;
                
                node.style.display = 'none';
                setTimeout( function () {
                    node.style.display = original_style_display;
                }, 100 );
            }
            
        } // end of check_obstacling_node()
        
        
        d.addEventListener( 'contextmenu', function ( event ) {
            check_obstacling_node( event.target );
        }, false );
    
    } // end of start_mouse_observer()
    
    
    function main() {
        // 新規に挿入されるツイートの監視開始
        start_inserted_node_observer();
        
        // 最初に表示されているすべてのツイートをチェック
        if ( is_valid_url() ) {
            check_tweets( d.body );
        }
        
        // キー入力の監視開始
        start_key_observer();
        
        // マウスの監視開始
        start_mouse_observer();
        
    } // end of main()
    
    main();
    
} // end of initialize()


if ( typeof w.twOpenOriginalImage_chrome_init == 'function' ) {
    // Google Chorme 拡張機能から実行した場合、ユーザーオプションを読み込む
    w.twOpenOriginalImage_chrome_init( function ( user_options ) {
        initialize( user_options );
    } );
}
else {
    initialize();
}

} )( window, document );

// ■ end of file
