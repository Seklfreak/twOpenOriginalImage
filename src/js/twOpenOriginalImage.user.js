// ==UserScript==
// @name            twOpenOriginalImage
// @namespace       http://furyu.hatenablog.com/
// @author          furyu
// @version         0.1.5.11
// @include         http://twitter.com/*
// @include         https://twitter.com/*
// @include         https://pbs.twimg.com/media/*
// @include         https://tweetdeck.twitter.com/*
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

if ( w[ SCRIPT_NAME + '_touched' ] ) {
    return;
}
w[ SCRIPT_NAME + '_touched' ] = true;


// ■ パラメータ
var OPTIONS = {
    SHOW_IN_DETAIL_PAGE : true // true: 詳細ページで動作
,   SHOW_IN_TIMELINE : true // true: タイムラインで動作
,   ENABLED_ON_TWEETDECK : true // true: TweetDeck 上で有効
,   DISPLAY_ALL_IN_ONE_PAGE : true // true: [Click] 全ての画像を同一ページで開く / [Alt]+[Click] 画像を個別に開く、false: 左記の逆の動作
,   DISPLAY_OVERLAY : true // true: 全ての画像を同一ページで開く際に(別タブで開かず)タイムライン上にオーバーレイする
,   OVERRIDE_CLICK_EVENT : true // true: ツイート中の画像クリックで原寸画像を開く
,   DOWNLOAD_HELPER_SCRIPT_IS_VALID : true // true: ダウンロードヘルパー機能有効

,   OPERATION : true // true: 動作中、false: 停止中

,   WAIT_AFTER_OPENPAGE : 500 // Firefox でページを開いた後、画像を挿入するまでのタイムラグ(ms)
    // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない
,   KEYCODE_DISPLAY_IMAGES : 86 // 画像を開くときのキーコード(keydown用)(86=[v])
,   KEYCODE_CLOSE_OVERLAY : 27 // 画像を閉じるときのキー(keydown用)(27=[Esc])(※オーバーレイ時のみ)
,   HELP_KEYCHAR_DISPLAY_IMAGES : 'v'
,   SCROLL_STEP : 100 // オーバーレイ表示時の[↑][↓]によるスクロール単位(pixel)
,   SMOOTH_SCROLL_STEP : 100 // オーバーレイ表示時のスムーズスクロール単位(pixel)
,   SMOOTH_SCROLL_INTERVAL : 10 // オーバーレイ表示時のスムーズスクロールの間隔(ms)
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
        OPTIONS.CLOSE_TEXT = '☒ 閉じる[Esc]';
        OPTIONS.BUTTON_TEXT = '原寸画像';
        OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE = '全ての画像を同一ページで開く';
        OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE = '画像を個別に開く';
        OPTIONS.DOWNLOAD_HELPER_BUTTON_TEXT = '↓ ダウンロード';
        OPTIONS.HELP_KEYPRESS_DISPLAY_IMAGES = '原寸画像を開く 【原寸びゅー】';
        OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE = '[j]次の画像 [k]前の画像 ';
        OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD = '[d]ダウンロード ';
        break;
    default:
        OPTIONS.TITLE_PREFIX = 'IMG: ';
        OPTIONS.TWEET_LINK_TEXT = 'Tweet';
        OPTIONS.CLOSE_TEXT = 'Close [Esc]';
        OPTIONS.BUTTON_TEXT = 'Original';
        OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE = 'Display all in one page';
        OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE = 'Display one image per page';
        OPTIONS.DOWNLOAD_HELPER_BUTTON_TEXT = 'Download';
        OPTIONS.HELP_KEYPRESS_DISPLAY_IMAGES = 'Display original images (' + SCRIPT_NAME + ')';
        OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE = '[j]next [k]previous ';
        OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD = '[d]download ';
        break;
}


var is_firefox = ( function () {
    var flag = ( 0 <= w.navigator.userAgent.toLowerCase().indexOf( 'firefox' ) );
    
    return function () {
        return flag;
    };
} )(); // end of is_firefox()


var is_ie = ( function () {
    var flag = ( !! ( w.navigator.userAgent.toLowerCase().match( /(?:msie|trident)/ ) ) );
    
    return function () {
        return flag;
    };
} )(); // end of is_ie()


var is_mac = ( function () {
    var flag = ( 0 <= w.navigator.platform.toLowerCase().indexOf( 'mac' ) );
    
    return function () {
        return flag;
    };
} )(); // end of is_mac()


function is_bookmarklet() {
    return ( !! ( w[ SCRIPT_NAME + '_bookmarklet' ] ) );
} // end of is_bookmarklet()


var is_tweetdeck = ( function () {
    var flag = ( !! ( w.location.href.match( /^https?:\/\/tweetdeck\.twitter\.com/ ) ) );
    
    return function () {
        return flag;
    };
} )(); // end of is_tweetdeck()


function get_img_orig_url( img_url ) {
    return img_url.replace( /:\w*$/, '' ) + ':orig';
} // end of get_img_orig_url()


function has_some_classes( node, class_list ) {
    if ( ! Array.isArray( class_list ) ) {
        class_list = [ class_list ];
    }
    
    return class_list.some( function ( class_name, index, self ) {
        return node.classList.contains( class_name );
    } );
} // end of has_some_classes()


function search_ancestor( node, class_list, contains_self ) {
    var ancestor = null;
    
    if ( ! contains_self ) {
        node = node.parentNode;
    }
    
    while ( node && ( node.nodeType == 1 ) ) {
        if ( has_some_classes( node, class_list ) ) {
            ancestor = node;
            break;
        }
        node = node.parentNode;
    }
    return ancestor;
    
} // end of search_ancestor()


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
    
    link_template.className = 'download-link';
    link_style.display = 'inline-block';
    link_style.fontWeight = 'normal';
    link_style.fontSize = '12px';
    link_style.color = 'gray';
    link_style.background = 'white';
    link_style.textDecoration = 'none';
    link_style.margin = '0';
    link_style.padding = '4px 8px';
    link_style.border = 'solid 2px';
    link_style.borderRadius = '3px';
    
    function create_download_link( img_url, doc ) {
        if ( ! doc ) {
            doc = d;
        }
        
        var link = import_node( link_template, doc ),
            link_style = link.style,
            link_border_color = '#e1e8ed';
        
        link_style.borderColor = link_border_color;
        
        link.addEventListener( 'mouseover', function ( event ) {
            link_border_color = link_style.borderColor;
            link_style.borderColor = 'red';
        }, false );
        
        link.addEventListener( 'mouseout', function ( event ) {
            link_style.borderColor = link_border_color;
        }, false );
        
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
    
    if ( is_tweetdeck() && ( ! OPTIONS.ENABLED_ON_TWEETDECK ) ) {
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
    
    
    function fire_event( target_element, event_kind ) {
        var cutsom_event = d.createEvent( 'HTMLEvents' );
        
        cutsom_event.initEvent( event_kind, true, false );
        target_element.dispatchEvent( cutsom_event );
    } // end of fire_event()
    
    
    var add_open_button = ( function () {
        var button_container_classname = SCRIPT_NAME + 'Button',
            opened_name_map = {},
            
            header_template = ( function () {
                var header_template = d.createElement( 'h1' ),
                    header_style = header_template.style;
                
                header_style.fontSize = '16px';
                header_style.margin = '0 0 8px';
                header_style.padding = '6px 8px 2px';
                header_style.height = '16px';
                header_style.fontFamily = 'Arial, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", Osaka, メイリオ, Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", sans-serif';
                header_style.lineHeight = '0.8';
                
                return header_template;
            } )(),
            
            button_container_template = ( function () {
                var button_container_template = d.createElement( 'div' ),
                    button = d.createElement( 'input' ),
                    button_container_style = button_container_template.style,
                    button_style = button.style,
                    alt_text = ( is_mac() ) ? '[option]' : '[Alt]';
                
                button.type = 'button';
                button_style.padding = '2px 6px';
                button_style.color = 'gray';
                button_style.background = 'white';
                
                if ( OPTIONS.DISPLAY_ALL_IN_ONE_PAGE ) {
                    button.title = escape_html( '[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE + ' / ' + alt_text + '+[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE );
                }
                else {
                    button.title = escape_html( '[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ONE_PER_PAGE + ' / ' + alt_text + '+[Click]: ' + OPTIONS.BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE );
                }
                
                button.value = escape_html( OPTIONS.BUTTON_TEXT );
                button_container_template.className = 'ProfileTweet-action ' + button_container_classname;
                button_container_template.appendChild( button );
                
                return button_container_template;
            } )(),
            
            link_template = ( function () {
                var link_template = d.createElement( 'a' ),
                    link_style = link_template.style;
                
                link_template.target = '_blank';
                link_style.textDecoration = 'none';
                link_style.color = '#66757f';
                
                return link_template;
            } )(),
            
            img_template = ( function () {
                var img_template = d.createElement( 'img' ),
                    img_style = img_template.style;
                
                img_style.maxWidth = '100%';
                img_style.height = 'auto';
                img_style.background = 'white';
                
                return img_template;
            } )(),
            
            img_link_container_template = ( function () {
                var img_link_container_template = d.createElement( 'div' ),
                    img_link_container_style = img_link_container_template.style;
                
                img_link_container_template.className = 'image-link-container';
                img_link_container_style.clear = 'both';
                img_link_container_style.margin = '0 0 8px 0';
                img_link_container_style.padding = '0 0 4px 0';
                img_link_container_style.textAlign = 'center';
                
                return img_link_container_template;
            } )(),
            
            download_link_container_template = ( function () {
                var download_link_container_template = d.createElement( 'div' ),
                    download_link_container_style = download_link_container_template.style;
                
                download_link_container_template.className = 'download-link-container';
                download_link_container_style.margin = '0 0 1px 0';
                
                return download_link_container_template;
            } )(),
            
            download_frame_template = ( function () {
                var download_frame_template = d.createElement( 'iframe' ),
                    download_frame_style = download_frame_template.style;
                
                download_frame_template.name = SCRIPT_NAME + '_download_frame';
                download_frame_style.width = '0';
                download_frame_style.height = '0';
                download_frame_style.visibility = 'hidden';
                
                return download_frame_template;
            } )(),
            
            image_overlay = ( function () {
                var top_offset = 26,
                    image_overlay_image_container = ( function () {
                        var image_overlay_image_container = d.createElement( 'div' ),
                            image_overlay_image_container_style = image_overlay_image_container.style;
                        
                        image_overlay_image_container.className = SCRIPT_NAME + '_image_overlay_image_container';
                        image_overlay_image_container_style.width = '100%';
                        image_overlay_image_container_style.height = 'auto';
                        
                        return image_overlay_image_container;
                    } )(),
                    
                    image_overlay_container = ( function () {
                        var image_overlay_container = d.createElement( 'div' ),
                            image_overlay_container_style = image_overlay_container.style,
                            timerid_list = [];
                        
                        image_overlay_container.id = SCRIPT_NAME + '_image_overlay_container';
                        image_overlay_container_style.display = 'none';
                        image_overlay_container_style.position = 'fixed';
                        image_overlay_container_style.top = 0;
                        image_overlay_container_style.bottom = 0;
                        image_overlay_container_style.left = 0;
                        image_overlay_container_style.right = 0;
                        image_overlay_container_style.overflow = 'auto';
                        image_overlay_container_style.zIndex = 10000;
                        image_overlay_container_style.padding = top_offset + 'px 0 32px 0';
                        image_overlay_container_style.background = 'rgba( 0, 0, 0, 0.8 )';
                        
                        image_overlay_container.appendChild( image_overlay_image_container );
                        
                        
                        function clear_timerid_list() {
                            while ( 0 < timerid_list.length ) {
                                var timerid = timerid_list.pop();
                                clearTimeout( timerid );
                            }
                        } // end of clear_timerid_list()
                        
                        
                        function remove_timerid( timerid ) {
                            var index = timerid_list.indexOf( timerid );
                            if ( 0 <= index ) {
                                timerid_list.splice( index, 1 );
                            }
                        } // end of remove_timerid()
                        
                        
                        function lock_mouseover( wait_offset ) {
                            if ( ! wait_offset ) {
                                wait_offset = 0;
                            }
                            var timerid = setTimeout( function() {
                                remove_timerid( timerid );
                            }, wait_offset + 500 );
                            
                            timerid_list.push( timerid );
                        } // end of lock_mouseover()
                        
                        
                        function mouseover_is_locked() {
                            return ( 0 < timerid_list.length );
                        } // end of mouseover_is_locked()
                        
                        
                        function set_image_container_to_current( target_container, options ) {
                            if ( ! target_container ) {
                                return;
                            }
                            
                            if ( ! options ) {
                                options = {};
                            }
                            
                            var scroll_to = options.scroll_to,
                                smooth_scroll = options.smooth_scroll;
                            
                            if ( ! target_container.classList.contains( 'current' ) ) {
                                var current_container = image_overlay_container.querySelector( '.image-link-container.current' );
                                
                                if ( current_container ) {
                                    var download_link = current_container.querySelector( '.download-link' );
                                    
                                    if ( download_link ) {
                                        download_link.style.border = 'solid 2px #e1e8ed';
                                        download_link.style.background = 'white';
                                    }
                                    current_container.style.background = 'transparent';
                                    current_container.classList.remove( 'current' );
                                }
                                
                                target_container.classList.add( 'current' );
                                target_container.style.background = 'rgba( 128, 128, 128, 0.1 )';
                                
                                var download_link = target_container.querySelector( '.download-link' );
                                
                                if ( download_link ) {
                                    download_link.style.border = 'solid 2px silver';
                                    download_link.style.background = 'lightyellow';
                                }
                                
                                clear_node( image_overlay_status_container );
                                image_overlay_status_container.appendChild( d.createTextNode( target_container.getAttribute( 'data-image-number' ) + ' / ' + target_container.getAttribute( 'data-image-total' ) ) );
                            }
                            
                            if ( ! scroll_to ) {
                                return;
                            }
                            
                            if ( smooth_scroll ) {
                                var target_container_top = target_container.getBoundingClientRect().top - top_offset,
                                    scroll_height = Math.abs( target_container_top ),
                                    scroll_direction = ( target_container_top < 0 ) ? -1 : 1;
                                
                                image_overlay_container_smooth_scroll( {
                                    scroll_height : scroll_height
                                ,   step : scroll_direction * OPTIONS.SMOOTH_SCROLL_STEP
                                ,   lock_after_scroll : true
                                } );
                            }
                            else {
                                image_overlay_container_scroll_to( {
                                    offset : target_container.getBoundingClientRect().top - top_offset
                                ,   lock_after_scroll : true
                                } );
                            }
                        } // end of set_image_container_to_current()
                        
                        
                        function image_overlay_container_scroll_to( options ) {
                            var options = ( options ) ? options : {},
                                offset = options.offset,
                                lock_after_scroll = options.lock_after_scroll;
                            
                            if ( lock_after_scroll ) {
                                // スクロール完了後にウェイトを設ける(mousemove等のイベントをすぐには発火させないため)
                                lock_mouseover();
                            }
                            image_overlay_container.scrollTop = offset;
                        } // end of image_overlay_container_scroll_to()
                        
                        
                        function image_overlay_container_scroll_step( step ) {
                            image_overlay_container_scroll_to( {
                                offset : image_overlay_container.scrollTop + step
                            } );
                        } // end of image_overlay_container_scroll_step()
                        
                        
                        function image_overlay_container_smooth_scroll( options ) {
                            var options = ( options ) ? options : {},
                                scroll_height = options.scroll_height,
                                step = options.step,
                                interval = options.interval,
                                lock_after_scroll = options.lock_after_scroll,
                                remain_height = scroll_height,
                                step = ( step ) ? step : OPTIONS.SMOOTH_SCROLL_STEP,
                                direction = ( step < 0 ) ? -1 : 1,
                                step = Math.abs( step ),
                                interval = ( interval ) ? interval : OPTIONS.SMOOTH_SCROLL_INTERVAL;
                            
                            for ( var ci = 0; 0 < remain_height; ci ++, remain_height -= step ) {
                                ( function ( remain_height, timing ) {
                                    var timerid = setTimeout( function () {
                                        var current_step = direction * ( ( step < remain_height ) ? step : remain_height );
                                        image_overlay_container_scroll_step( current_step );
                                        
                                        remove_timerid( timerid );
                                    }, timing );
                                    
                                    timerid_list.push( timerid );
                                } )( remain_height, interval * ci );
                            }
                            
                            if ( lock_after_scroll ) {
                                // スクロール完了後にウェイトを設ける(mousemove等のイベントをすぐには発火させないため)
                                lock_mouseover( interval * ci );
                            }
                        } // end of image_overlay_container_smooth_scroll()
                        
                        
                        function image_overlay_container_page_step( direction ) {
                            var direction = ( direction ) ? direction : 1;
                            
                            image_overlay_container_smooth_scroll( {
                                scroll_height : image_overlay_container.clientHeight
                            ,   step : direction * OPTIONS.SMOOTH_SCROLL_STEP - top_offset 
                            } );
                        
                        } // end of image_overlay_container_page_step()
                        
                        
                        function image_overlay_container_image_init() {
                            var image_link_containers = to_array( image_overlay_container.querySelectorAll( '.image-link-container' ) ),
                                start_container = image_overlay_container.querySelector( '.image-link-container.start' ),
                                start_container = ( start_container ) ? start_container : image_overlay_container.querySelector( '.image-link-container' );
                            
                            image_link_containers.forEach( function ( image_link_container, index ) {
                                var image_link = image_link_container.querySelector( '.image-link' );
                                
                                
                                function set_focus( event ) {
                                    event.stopPropagation();
                                    event.preventDefault();
                                    
                                    set_image_container_to_current( image_link_container, {
                                        scroll_to : true
                                    ,   smooth_scroll : true
                                    } );
                                } // end of set_focus()
                                
                                
                                function set_focus_mouseover( event ) {
                                    if ( mouseover_is_locked() ) {
                                        return;
                                    }
                                    set_image_container_to_current( image_link_container );
                                } // end of set_focus_mouseover()
                                
                                
                                image_link.addEventListener( 'click', set_focus );
                                image_link_container.addEventListener( 'mouseover', set_focus_mouseover );
                                image_link_container.addEventListener( 'mousemove', set_focus_mouseover );
                            } );
                            
                            image_overlay_image_container.style.visibility = 'visible';
                            
                            set_image_container_to_current( start_container, {
                                scroll_to : true
                            } );
                        } // end of image_overlay_container_image_init()
                        
                        
                        function image_overlay_container_image_step( direction ) {
                            var direction = ( direction ) ? direction : 1,
                                image_link_containers = to_array( image_overlay_container.querySelectorAll( '.image-link-container' ) ),
                                current_container = image_overlay_container.querySelector( '.image-link-container.current' ),
                                next_container;
                            
                            if ( image_link_containers.length <= 0 ) {
                                return;
                            }
                            
                            if ( current_container ) {
                                next_container = ( 0 < direction ) ? current_container.nextSibling : current_container.previousSibling;
                                
                                while ( next_container ) {
                                    if ( next_container.classList.contains( 'image-link-container' ) ) {
                                        break;
                                    }
                                    next_container = ( 0 < direction ) ? next_container.nextSibling : next_container.previousSibling;
                                }
                                if ( ! next_container ) {
                                    next_container = ( 0 < direction ) ? image_link_containers[ 0 ] : image_link_containers[ image_link_containers.length - 1 ];
                                }
                            }
                            else {
                                next_container = image_link_containers[ 0 ];
                            }
                            
                            set_image_container_to_current( next_container, {
                                scroll_to : true
                            ,   smooth_scroll : true
                            } );
                        } // end of image_overlay_container_image_step()
                        
                        
                        function image_overlay_container_download_current_image() {
                            var download_link = image_overlay_container.querySelector( '.image-link-container.current .download-link' );
                            
                            if ( download_link ) {
                                download_link.click();
                            }
                        } // end of image_overlay_container_download_current_image()
                        
                        image_overlay_container.addEventListener( 'scroll-to-top', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_to( {
                                offset : 0
                            } );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'scroll-to-bottom', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_to( {
                                offset : image_overlay_container.scrollHeight
                            } );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'smooth-scroll-to-top', function () {
                            clear_timerid_list();
                            image_overlay_container_smooth_scroll( {
                                scroll_height : image_overlay_container.scrollTop
                            ,   step : - OPTIONS.SMOOTH_SCROLL_STEP
                            } );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'smooth-scroll-to-bottom', function () {
                            clear_timerid_list();
                            image_overlay_container_smooth_scroll( {
                                scroll_height : image_overlay_container.scrollHeight - image_overlay_container.scrollTop
                            ,   step : OPTIONS.SMOOTH_SCROLL_STEP
                            } );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'scroll-down', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_step( OPTIONS.SCROLL_STEP );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'scroll-up', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_step( - OPTIONS.SCROLL_STEP );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'page-up', function () {
                            clear_timerid_list();
                            image_overlay_container_page_step( -1 );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'page-down', function () {
                            clear_timerid_list();
                            image_overlay_container_page_step();
                        }, false );
                        
                        image_overlay_container.addEventListener( 'image-init', function () {
                            clear_timerid_list();
                            image_overlay_container_image_init();
                        }, false );
                        
                        image_overlay_container.addEventListener( 'image-next', function () {
                            clear_timerid_list();
                            image_overlay_container_image_step();
                        }, false );
                        
                        image_overlay_container.addEventListener( 'image-prev', function () {
                            clear_timerid_list();
                            image_overlay_container_image_step( -1 );
                        }, false );
                        
                        image_overlay_container.addEventListener( 'download-image', function () {
                            clear_timerid_list();
                            image_overlay_container_download_current_image();
                        }, false );
                        
                        d.body.appendChild( image_overlay_container );
                        
                        return image_overlay_container;
                    } )(),
                    
                    image_overlay_close_link = ( function () {
                        var image_overlay_close_link = import_node( link_template ),
                            image_overlay_close_link_style = image_overlay_close_link.style;
                        
                        image_overlay_close_link.className = SCRIPT_NAME + '_close_overlay';
                        image_overlay_close_link_style.display = 'block';
                        image_overlay_close_link_style.cssFloat = 'right';
                        image_overlay_close_link_style.margin = '0 8px';
                        
                        image_overlay_close_link.appendChild( d.createTextNode( OPTIONS.CLOSE_TEXT ) );
                        
                        return image_overlay_close_link;
                    } )(),
                    
                    image_overlay_status_container = ( function () {
                        var image_overlay_status_container = d.createElement( 'div' ),
                            image_overlay_status_container_style = image_overlay_status_container.style;
                        
                        image_overlay_status_container.className = SCRIPT_NAME + '_status_overlay';
                        image_overlay_status_container_style.position = 'absolute';
                        image_overlay_status_container_style.top = 0;
                        image_overlay_status_container_style.right = 0;
                        image_overlay_status_container_style.bottom = 0;
                        image_overlay_status_container_style.left = 0;
                        image_overlay_status_container_style.padding = '6px 0';
                        image_overlay_status_container_style.textAlign = 'center';
                        image_overlay_status_container_style.pointerEvents = 'none';
                        
                        return image_overlay_status_container;
                    } )(),
                    
                    image_overlay_shortcut_help = ( function () {
                        var image_overlay_shortcut_help = d.createElement( 'div' ),
                            image_overlay_shortcut_help_style = image_overlay_shortcut_help.style;
                        
                        image_overlay_shortcut_help.className = SCRIPT_NAME + '_shortcut_help_overlay';
                        image_overlay_shortcut_help_style.cssFloat = 'left';
                        image_overlay_shortcut_help_style.margin = '2px 8px';
                        image_overlay_shortcut_help_style.fontWeight = 'normal';
                        image_overlay_shortcut_help_style.fontSize = '14px';
                        
                        return image_overlay_shortcut_help;
                    } )(),
                    
                    image_overlay_header = ( function () {
                        var image_overlay_header = import_node( header_template ),
                            image_overlay_header_style = image_overlay_header.style;
                        
                        image_overlay_header.id = SCRIPT_NAME + '_image_overlay_header';
                        image_overlay_header_style.display = 'none';
                        image_overlay_header_style.position = 'fixed';
                        image_overlay_header_style.top = 0;
                        image_overlay_header_style.left = 0;
                        image_overlay_header_style.width = '100%';
                        image_overlay_header_style.padding = '6px 0 2px';
                        image_overlay_header_style.background = 'white';
                        image_overlay_header_style.borderBottom = 'solid 1px silver';
                        image_overlay_header_style.zIndex = 10001;
                        
                        image_overlay_header.appendChild( image_overlay_shortcut_help );
                        image_overlay_header.appendChild( image_overlay_status_container );
                        image_overlay_header.appendChild( image_overlay_close_link );
                        
                        d.body.appendChild( image_overlay_header );
                        
                        return image_overlay_header;
                    } )();
                
                return {
                    container : image_overlay_container
                ,   image_container : image_overlay_image_container
                ,   header : image_overlay_header
                ,   close_link : image_overlay_close_link
                ,   status_container : image_overlay_status_container
                ,   shortcut_help : image_overlay_shortcut_help
                }
            } )(),
            
            image_overlay_container = image_overlay.container,
            image_overlay_image_container = image_overlay.image_container,
            image_overlay_header = image_overlay.header,
            image_overlay_close_link = image_overlay.close_link,
            image_overlay_status_container = image_overlay.status_container,
            image_overlay_shortcut_help = image_overlay.shortcut_help;
        
        
        function add_images_to_page( img_urls, parent, options ) {
            if ( ! options ) {
                options = {};
            }
            var target_document = options.document,
                callback = options.callback,
                start_img_url = options.start_img_url;
            
            if ( ! target_document ) {
                target_document = d;
            }
            
            var remaining_images_counter = 0;
            
            img_urls.forEach( function ( img_url, index ) {
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
                                old_iframe = null;
                            }
                            iframe.src = img_url;
                            target_document.documentElement.appendChild( iframe );
                            
                            return false;
                        }, false );
                    }
                    download_link_container.appendChild( download_link );
                    img_link_container.appendChild( download_link_container );
                }
                
                img.className = 'original-image';
                
                remaining_images_counter ++;
                
                function check_loaded_image( event ) {
                    img.setAttribute( 'width', img.naturalWidth );
                    img.setAttribute( 'height', img.naturalHeight );
                    
                    remaining_images_counter --;
                    if ( remaining_images_counter <= 0 && typeof callback == 'function' ) {
                        callback();
                    }
                } // end of check_loaded_image()
                
                img.addEventListener( 'load', check_loaded_image );
                img.addEventListener( 'error', check_loaded_image );
                
                img.src = link.href = img_url;
                
                link.className = 'image-link';
                link.appendChild( img );
                link.addEventListener( 'click', function ( event ) {
                    event.stopPropagation();
                }, false );
                
                img_link_container.appendChild( link );
                
                if ( img_url == start_img_url ) {
                    img_link_container.classList.add( 'start' );
                }
                img_link_container.setAttribute( 'data-image-number', index + 1 );
                img_link_container.setAttribute( 'data-image-total', img_urls.length );
                parent.appendChild( img_link_container );
            } );
        } // end of add_images_to_page()
        
        
        function show_overlay( img_urls, tweet_url, title, start_img_url ) {
            if ( image_overlay_container.style.display != 'none' ) {
                // TODO: 重複して呼ばれるケース(不正な動作)に対するガード
                //console.error( 'show_overlay(): duplicate called' );
                return;
            }
            
            var html_element = d.querySelector( 'html' ),
                body = d.body,
                
                image_overlay_container_style = image_overlay_container.style,
                image_overlay_header_style = image_overlay_header.style,
                image_overlay_image_container_style = image_overlay_image_container.style,
                html_style = html_element.style,
                body_style = body.style,
                
                saved_html_overflowY = html_style.overflowY,
                saved_body_position = body_style.position,
                saved_body_overflowY = body_style.overflowY,
                saved_body_marginRight = body_style.marginRight;
            
            
            function close_image_overlay_container( event ) {
                event.stopPropagation();
                event.preventDefault();
                
                fire_event( image_overlay_container, 'scroll-to-top' );
                
                image_overlay_image_container_style.visibility = 'hidden';
                image_overlay_container_style.display = 'none';
                image_overlay_header_style.display = 'none';
                body_style.marginRight = saved_body_marginRight;
                body_style.overflowY = saved_body_overflowY;
                if ( is_tweetdeck() ) {
                    html_style.overflowY = saved_html_overflowY;
                }
                image_overlay_container.removeEventListener( 'click', close_image_overlay_container, false );
                image_overlay_header.removeEventListener( 'click', close_image_overlay_container, false );
                image_overlay_close_link.removeEventListener( 'click', close_image_overlay_container, false );
                
                clear_node( image_overlay_image_container );
                
                return false;
            } // end of close_image_overlay_container()
            
            
            image_overlay_image_container_style.visibility = 'hidden';
            clear_node( image_overlay_image_container );
            
            image_overlay_close_link.href = tweet_url;
            add_images_to_page( img_urls, image_overlay_image_container, {
                start_img_url : start_img_url
            ,   callback : function () {
                    if ( image_overlay_container.style.display == 'none' ) {
                        return;
                    }
                    fire_event( image_overlay_container, 'image-init' );
                }
            } );
            
            clear_node( image_overlay_shortcut_help );
            
            if ( 1 < image_overlay_image_container.querySelectorAll( '.image-link-container' ).length ) {
                image_overlay_shortcut_help.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE ) );
            }
            if ( OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID && ( ! is_ie() ) ) {
                image_overlay_shortcut_help.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD ) );
            }
            
            image_overlay_close_link.addEventListener( 'click', close_image_overlay_container, false );
            image_overlay_header.addEventListener( 'click', close_image_overlay_container, false );
            image_overlay_container.addEventListener( 'click', close_image_overlay_container, false );
            
            if ( is_tweetdeck() ) {
                html_style.overflowY = 'hidden';
            }
            body_style.overflowY = 'hidden';
            body_style.marginRight = 0;
            image_overlay_header_style.display = 'block';
            image_overlay_container_style.display = 'block';
            
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
                
                add_images_to_page( img_urls, body, { document : child_document } );
                
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
            var tweet_container = ( is_tweetdeck() ) ? search_ancestor( tweet, [ 'js-stream-item' ] ) : null,
                tweet_container = ( tweet_container ) ? tweet_container : tweet,
                old_button = tweet_container.querySelector( '.' + button_container_classname );
            
            if ( old_button ) {
                old_button.parentNode.removeChild( old_button );
                old_button = null;
            }
            
            var gallery = search_ancestor( tweet, [ 'Gallery', 'js-modal-panel' ] );
            
            if ( gallery ) {
                old_button = gallery.querySelector( '.' + button_container_classname );
                if ( old_button ) {
                    old_button.parentNode.removeChild( old_button );
                    old_button = null;
                }
            }
            
            var gallery_media = ( gallery ) ? gallery.querySelector( '.Gallery-media, .js-embeditem' ) : null,
                img_objects = ( gallery_media ) ? gallery_media.querySelectorAll( 'img.media-image, img.media-img' ) : null,
                img_objects = ( img_objects && ( 0 < img_objects.length ) ) ? img_objects : tweet_container.querySelectorAll( '.AdaptiveMedia-photoContainer img, a.js-media-image-link img.media-img, div.js-media > div:not(.is-video) a.js-media-image-link[rel="mediaPreview"]' ),
                action_list = ( gallery_media ) ? gallery_media.querySelector( '.js-media-preview-container' ) : null,
                action_list = ( action_list ) ? action_list : tweet_container.querySelector( '.ProfileTweet-actionList, footer' );
            
            if ( ( img_objects.length <= 0 ) || ( ! action_list ) ) {
                return null;
            }
            
            var img_urls = [];
            
            to_array( img_objects ).forEach( function ( img ) {
                if ( img.src ) {
                    var img_url = get_img_orig_url( img.src );
                    
                    img_urls.push( img_url );
                }
                else if ( img.href ) {
                    var img_url = img.style.backgroundImage && img.style.backgroundImage.match( /url\(['"\s]*(.*?)['"\s]*\)/ )[1];
                    
                    if ( img_url ) {
                        img_url = get_img_orig_url( img_url );
                        img_urls.push( img_url );
                    }
                }
            } );
            
            if ( img_urls.length <= 0 ) {
                return null;
            }
            
            var button_container = button_container_template.cloneNode( true ),
                button = button_container.querySelector( 'input[type="button"]' );
            
            button.addEventListener( 'click', function ( event ) {
                event.stopPropagation();
                
                var focused_img_url = button.getAttribute( 'data-target-img-url' ),
                    target_img_urls = img_urls.slice( 0 );
                
                button.removeAttribute( 'data-target-img-url' );
                
                if ( OPTIONS.DISPLAY_ALL_IN_ONE_PAGE ^ event.altKey ) {
                    var tweet_link = tweet.querySelector( 'a[rel="url"]' ),
                        tweet_url = tweet.getAttribute( 'data-permalink-path' ) || ( tweet_link && tweet_link.href ),
                        tweet_text = tweet.querySelector( '.tweet-text' ),
                        title = ( tweet_text ) ? tweet_text.textContent : '';
                    
                    if ( OPTIONS.DISPLAY_OVERLAY ) {
                        show_overlay( target_img_urls, tweet_url, title, focused_img_url );
                    }
                    else {
                        
                        open_page( ( focused_img_url ) ? [ focused_img_url ] : target_img_urls, tweet_url, title );
                    }
                }
                else {
                    if ( focused_img_url ) {
                        target_img_urls = [ focused_img_url ];
                    }
                    target_img_urls.reverse();
                    target_img_urls.forEach( function ( img_url ) {
                        w.open( img_url, '_blank' );
                    } );
                }
                return false;
            }, false );
            
            if ( is_tweetdeck() ) {
                if ( action_list.tagName == 'FOOTER' && search_ancestor( img_objects[ 0 ], [ 'js-tweet', 'tweet' ] ) ) {
                    action_list.insertBefore( button_container, action_list.firstChild );
                }
                else {
                    action_list.appendChild( button_container );
                }
            }
            else {
                action_list.appendChild( button_container );
            }
            
            if ( OPTIONS.OVERRIDE_CLICK_EVENT ) {
                if ( gallery_media && ( ! is_tweetdeck() ) ) {
                    // TODO: ナビが覆いかぶさっている(z-index:1)ため、手前に出して画像クリックイベントの方を優先化しているが、もっとスマートな方法は無いか？
                    gallery_media.style.zIndex = 10;
                    gallery_media.style.pointerEvents = 'none';
                }
                
                to_array( img_objects ).forEach( function ( img ) {
                    if ( is_tweetdeck() && ! gallery_media ) {
                        return;
                    }
                    
                    if ( img.classList.contains( SCRIPT_NAME + '_touched' ) ) {
                        fire_event( img, 'remove-image-events' );
                    }
                    
                    function open_target_image( event ) {
                        event.stopPropagation();
                        event.preventDefault();
                        
                        if ( img.src ) {
                            button.setAttribute( 'data-target-img-url', get_img_orig_url( img.src ) );
                            button.click();
                        }
                        
                        return false;
                    } // end of open_target_image()
                    
                    
                    function remove_image_events( event ) {
                        img.removeEventListener( 'remove-image-events', remove_image_events, false );
                        img.removeEventListener( 'click', open_target_image, false );
                        img.classList.remove( SCRIPT_NAME + '_touched' );
                    } // end of remove_image_events()
                    
                    
                    img.addEventListener( 'click', open_target_image, false );
                    img.addEventListener( 'remove-image-events', remove_image_events, false );
                    
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
        
        var tweet_list = to_array( node.querySelectorAll( 'div.js-stream-tweet, div.tweet, div.js-tweet' ) );
        
        if ( node.tagName == 'DIV' ) {
            if ( has_some_classes( node, [ 'js-stream-tweet', 'tweet', 'js-tweet' ] ) ) {
                tweet_list.push( node );
            }
            else if ( ! has_some_classes( node, [ SCRIPT_NAME + 'Button' ] ) ) {
                var ancestor = has_some_classes( node, [ 'js-media-preview-container' ] ) && search_ancestor( node, [ 'js-modal-panel' ] );
                
                if ( ancestor ) {
                    var tweet = ancestor.querySelector( 'div.js-stream-tweet, div.tweet, div.js-tweet' );
                    
                    if ( tweet ) {
                        tweet_list.push( tweet );
                    }
                }
            }
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
        var help_dialog = ( ( node.getAttribute( 'id' ) == 'keyboard-shortcut-dialog' ) || ( node.classList.contains( 'keyboard-shortcut-list-modal' ) ) ) ? node : node.querySelector( 'keyboard-shortcut-dialog, keyboard-shortcut-list-modal' );
        if ( ( ! help_dialog ) || ( help_dialog.querySelector( '.' + SCRIPT_NAME + '_key_help' ) ) ) {
            return false;
        }
        
        if ( is_tweetdeck() ) {
            var keyboard_shortcut_list = help_dialog.querySelector( 'dl.keyboard-shortcut-list' ),
                dd = d.createElement( 'dd' ),
                span = d.createElement( 'span' );
            
            span.className = 'text-like-keyboard-key';
            span.appendChild( d.createTextNode( OPTIONS.HELP_KEYCHAR_DISPLAY_IMAGES.toUpperCase() ) );
            dd.className = 'keyboard-shortcut-definition';
            dd.appendChild( span );
            dd.appendChild( d.createTextNode( ' ' + OPTIONS.HELP_KEYPRESS_DISPLAY_IMAGES ) );
            
            keyboard_shortcut_list.appendChild( dd );
        }
        else {
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
        }
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
    
    
    function get_visible_overlay_container() {
        var image_overlay_container = d.querySelector( '#' + SCRIPT_NAME + '_image_overlay_container' );
        
        return ( image_overlay_container && image_overlay_container.style.display != 'none' ) ? image_overlay_container : null;
        
    } // end of get_visible_overlay_container()
    
    
    function close_overlay() {
        var image_overlay_container = get_visible_overlay_container();
        
        if ( ! image_overlay_container ) {
            return false;
        }
        
        var image_overlay_close_link = d.querySelector( '#' + SCRIPT_NAME + '_image_overlay_header a.' + SCRIPT_NAME + '_close_overlay' );
            
        if ( ! image_overlay_close_link ) {
            return false;
        }
        
        image_overlay_close_link.click();
        
        return true;
    } // end of close_overlay()
    
    
    function view_images_on_keypress( event ) {
        if ( close_overlay() ) {
            event.stopPropagation();
            event.preventDefault();
            
            return false;
        }
        
        function get_button( ancestor ) {
            return ( ancestor ) ? ancestor.querySelector( '.' + SCRIPT_NAME + 'Button input[type="button"]' ) : null;
        } // end of get_button()
        
        var gallery = d.querySelector( '.Gallery, .js-modal-panel' ),
            target_tweet = ( gallery && w.getComputedStyle( gallery ).display != 'none' ) ? gallery.querySelector( 'div.js-stream-tweet, div.tweet, div.js-tweet' ) : null,
            button = get_button( ( gallery && gallery.classList.contains( 'js-modal-panel' ) ) ? gallery : target_tweet );
        
        if ( ( ! target_tweet ) || ( ! button ) ) {
            target_tweet = d.querySelector( '.selected-stream-item div.js-stream-tweet, .selected-stream-item div.tweet, .is-selected-tweet div.tweet, .is-selected-tweet div.js-tweet' );
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
    
    
    function close_overlay_on_keypress( event ) {
        if ( ! close_overlay() ) {
            return;
        }
        
        event.stopPropagation();
        event.preventDefault();
        
        return false;
    } // end of close_overlay_on_keypress()
    
    
    function check_overlay_key_event( key_code, event ) {
        var image_overlay_container = get_visible_overlay_container();
        
        if ( ! image_overlay_container ) {
            return false;
        }
        
        var is_valid_key = true;
        
        switch ( key_code ) {
            case 13 : // [Enter]
            case 32 : // [Space]
                if ( event.shiftKey ) {
                    fire_event( image_overlay_container, 'page-up' );
                }
                else {
                    fire_event( image_overlay_container, 'page-down' );
                }
                break;
            case 68 : // [d]
                fire_event( image_overlay_container, 'download-image' );
                break;
            case 74 : // [j]
                fire_event( image_overlay_container, 'image-next' );
                break;
            case 75 : // [k]
                fire_event( image_overlay_container, 'image-prev' );
                break;
            case 37 : // [←]
                break;
            case 38 : // [↑]
                fire_event( image_overlay_container, 'scroll-up' );
                break;
            case 39 : // [→]
                break;
            case 40 : // [↓]
                fire_event( image_overlay_container, 'scroll-down' );
                break;
            case 36 : // [Home]
                fire_event( image_overlay_container, 'smooth-scroll-to-top' );
                break;
            case 35 : // [End]
                fire_event( image_overlay_container, 'smooth-scroll-to-bottom' );
                break;
            default :
                if ( 
                    ( 65 <= key_code && key_code <= 90 ) || // [A-Za-z]
                    ( 48 <= key_code && key_code <= 57 ) || // [0-9]
                    ( 188 <= key_code && key_code <= 191 ) // [,\-./<>?]
                ) {
                    // オーバーレイ表示中は、標準のショートカットキーを無効化
                    break;
                }
                is_valid_key = false;
                break;
        }
        
        if ( is_valid_key ) {
            event.stopPropagation();
            event.preventDefault();
        }
        return is_valid_key;
        
    } // end of check_overlay_key_event()
    
    
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
                default :
                    var image_overlay_container = get_visible_overlay_container();
                    
                    if ( ! image_overlay_container ) {
                        break;
                    }
                    
                    if (
                        ( 65 <= key_code && key_code <= 90 ) || // [A-Z]
                        ( 97 <= key_code && key_code <= 122 ) || // [a-z]
                        ( 48 <= key_code && key_code <= 57 ) || // [0-9]
                        ( 44 <= key_code && key_code <= 47 ) || // [,\-./]
                        ( 60 <= key_code && key_code <= 63 ) // [<=>?]
                    ) {
                        // オーバーレイ表示中は、標準のショートカットキーを無効化
                        event.stopPropagation();
                        event.preventDefault();
                    }
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
                case OPTIONS.KEYCODE_DISPLAY_IMAGES :
                    return view_images_on_keypress( event );
                
                case OPTIONS.KEYCODE_CLOSE_OVERLAY :
                    return close_overlay_on_keypress( event );
                    break;
                
                default :
                    if ( check_overlay_key_event( key_code, event ) ) {
                        return false;
                    }
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
