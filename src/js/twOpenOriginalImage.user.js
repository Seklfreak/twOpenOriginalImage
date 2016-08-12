// ==UserScript==
// @name            twOpenOriginalImage
// @namespace       http://furyu.hatenablog.com/
// @author          furyu
// @version         0.1.7.7
// @include         http://twitter.com/*
// @include         https://twitter.com/*
// @include         https://pbs.twimg.com/media/*
// @include         https://tweetdeck.twitter.com/*
// @require         https://cdnjs.cloudflare.com/ajax/libs/jszip/3.0.0/jszip.min.js
// @require         https://cdn.rawgit.com/eligrey/FileSaver.js/683f689326c231002164621dc8a6451df4e86e8a/FileSaver.min.js
// @grant           GM_xmlhttpRequest
// @description     Open images in original size on Twitter.
// ==/UserScript==

/*
■ 関連記事など
  [Twitter 原寸びゅー：Twitterの原寸画像を開くGoogle Chrome拡張機能＆ユーザースクリプト公開 - 風柳メモ](http://furyu.hatenablog.com/entry/20160116/1452871567)
  [furyutei/twOpenOriginalImage](https://github.com/furyutei/twOpenOriginalImage)

■ 参考元
- [GoogleChrome拡張機能「twitter画像原寸ボタン」ver. 2.0公開 - hogashi.*](http://hogashi.hatenablog.com/entry/2016/01/01/234632)
  [hogashi/twitterOpenOriginalImage](https://github.com/hogashi/twitterOpenOriginalImage)
    The MIT License (MIT)
    Copyright (c) hogas [@hogextend](https://twitter.com/hogextend)
    [twitterOpenOriginalImage/LICENSE](https://github.com/hogashi/twitterOpenOriginalImage/blob/master/LICENSE)

■ 外部ライブラリ
- [JSZip](https://stuk.github.io/jszip/)
    The MIT License
    Copyright (c) 2009-2014 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso
    [jszip/LICENSE.markdown](https://github.com/Stuk/jszip/blob/master/LICENSE.markdown)

- [eligrey/FileSaver.js: An HTML5 saveAs() FileSaver implementation](https://github.com/eligrey/FileSaver.js/)
    Copyright © 2015 Eli Grey.
    [FileSaver.js/LICENSE.md](https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md)
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

var SCRIPT_NAME = 'twOpenOriginalImage',
    SCRIPT_NAME_JA = '原寸びゅー';

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
,   DISPLAY_ORIGINAL_BUTTONS : true // true: [原寸画像]ボタンを表示
,   OVERRIDE_GALLERY_FOR_TWEETDECK : true // true: TweetDeck のギャラリー(画像サムネイルクリック時のポップアップ)を置換(OVERRIDE_CLICK_EVENT true 時のみ有効)
,   DOWNLOAD_HELPER_SCRIPT_IS_VALID : true // true: ダウンロードヘルパー機能有効
,   DOWNLOAD_ZIP_IS_VALID : true // true: ZIPダウンロード有効

,   OPERATION : true // true: 動作中、false: 停止中

,   WAIT_AFTER_OPENPAGE : 500 // Firefox でページを開いた後、画像を挿入するまでのタイムラグ(ms)
    // TODO: Firefox(Greasemonkey) で window.open() した後 document を書きかえるまでにウェイトをおかないとうまく行かない
,   KEYCODE_DISPLAY_IMAGES : 86 // 画像を開くときのキーコード(keydown用)(86=[v])
,   KEYCODE_CLOSE_OVERLAY : 27 // 画像を閉じるときのキー(keydown用)(27=[Esc])(※オーバーレイ時のみ)
,   HELP_KEYCHAR_DISPLAY_IMAGES : 'v'
,   SCROLL_STEP : 100 // オーバーレイ表示時の[↑][↓]によるスクロール単位(pixel)
,   SMOOTH_SCROLL_STEP : 100 // オーバーレイ表示時のスムーズスクロール単位(pixel)
,   SMOOTH_SCROLL_INTERVAL : 10 // オーバーレイ表示時のスムーズスクロールの間隔(ms)
,   DEFAULT_IMAGE_SIZE : 'fit-width' // オーバーレイ表示時の画像幅初期値 ( 'full' / 'fit-width' / 'fit-height' )
,   DEFAULT_IMAGE_BACKGROUND_COLOR : 'black' // オーバーレイ表示時の画像背景色初期値 ('black' または 'white')
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
        OPTIONS.HELP_KEYPRESS_DISPLAY_IMAGES = '原寸画像を開く 【' + SCRIPT_NAME_JA + '】';
        OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE_NEXT = '[j]次の画像';
        OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE_PREVIOUS = '[k]前の画像';
        OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD = '[d]保存';
        OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD_ZIP = '[z]ZIP';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE = '[s]サイズ:';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE_FULL = '原寸';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE_FIT_WIDTH = '幅調節';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE_FIT_HEIGHT = '高さ調節';
        OPTIONS.HELP_OVERLAY_SHORTCUT_BGCOLOR = '[b]背景:';
        OPTIONS.HELP_OVERLAY_SHORTCUT_BGCOLOR_BLACK = '黒';
        OPTIONS.HELP_OVERLAY_SHORTCUT_BGCOLOR_WHITE = '白';
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
        OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE_NEXT = '[j]next';
        OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE_PREVIOUS = '[k]previous';
        OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD = '[d]download';
        OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD_ZIP = '[z]ZIP';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE = '[s]size:';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE_FULL = 'full';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE_FIT_WIDTH = 'fit-width';
        OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE_FIT_HEIGHT = 'fit-height';
        OPTIONS.HELP_OVERLAY_SHORTCUT_BGCOLOR = '[b]bgcolor:';
        OPTIONS.HELP_OVERLAY_SHORTCUT_BGCOLOR_BLACK = 'black';
        OPTIONS.HELP_OVERLAY_SHORTCUT_BGCOLOR_WHITE = 'white';
        break;
}


function to_array( array_like_object ) {
    return Array.prototype.slice.call( array_like_object );
} // end of to_array()


var object_extender = ( function () {
    function object_extender( base_object ) {
        var template = object_extender.template,
            base_object = template.prototype = base_object,
            expanded_object = new template(),
            object_list = to_array( arguments );
        
        object_list.shift();
        object_list.forEach( function ( object ) {
            Object.keys( object ).forEach( function ( name ) {
                expanded_object[ name ] = object[ name ];
            } );
        } );
        
        return expanded_object;
    } // end of object_extender()
    
    object_extender.template = function () {};
    
    return object_extender;
} )(); // end of object_extender()


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


var is_bookmarklet = ( function () {
    var flag =  ( !! ( w[ SCRIPT_NAME + '_bookmarklet' ] ) );
    
    return function () {
        return flag;
    };
} )(); // end of is_bookmarklet()


var is_tweetdeck = ( function () {
    var flag = ( !! ( w.location.href.match( /^https?:\/\/tweetdeck\.twitter\.com/ ) ) );
    
    return function () {
        return flag;
    };
} )(); // end of is_tweetdeck()


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


function get_scroll_top( doc ) {
    if ( ! doc ) {
        doc = d;
    }
    return ( doc.body.scrollTop || doc.documentElement.scrollTop );
} // end of get_scroll_top()


function get_element_position( element, win ) {
    if ( ! win ) {
        win = w;
    }
    var rect = element.getBoundingClientRect();
    
    return {
        x : rect.left + win.pageXOffset
    ,   y : rect.top + win.pageYOffset
    };
} // end of get_element_position()


function fire_event( target_element, event_kind, doc ) {
    if ( ! doc ) {
        doc = d;
    }
    var cutsom_event = doc.createEvent( 'HTMLEvents' );
    
    cutsom_event.initEvent( event_kind, true, false );
    target_element.dispatchEvent( cutsom_event );
} // end of fire_event()


function get_mouse_position( event ) {
    var mouse_position = {
            x : event.pageX
        ,   y : event.pageY
        };
    
    return mouse_position;
} // end of get_mouse_position()


var event_functions = ( function() {
    var event_dict = {};
    
    
    function add_event( target, event_name, event_function, for_storage ) {
        if ( ! for_storage ) {
            target.addEventListener( event_name, event_function, false );
            return;
        }
        
        var self = this;
        
        function _event_function() {
            event_function.apply( self, arguments );
        } // end of _event_function()
        
        target.addEventListener( event_name, _event_function, false );
        
        var event_items = event_dict[ event_name ];
        
        if ( ! event_items ) {
            event_items = event_dict[ event_name ] = [];
        }
        
        event_items.push( {
            target : target
        ,   event_function : event_function
        ,   _event_function : _event_function
        } );
    } // end of add_event()
    
    
    function remove_event( target, event_name, event_function ) {
        var self = this,
            event_items = event_dict[ event_name ],
            is_found = false;
        
        if ( event_items ) {
            event_dict[ event_name ] = event_items.filter( function ( event_item ) {
                if ( ( event_item.target === target ) && ( ( ! event_function ) || ( event_item.event_function === event_function ) ) ) {
                    target.removeEventListener( event_name, event_item._event_function, false );
                    is_found = true;
                    return false;
                }
                return true;
            } );
        }
        
        if ( ! is_found && event_function ) {
            target.removeEventListener( event_name, event_function, false );
        }
    } // end of remove_event()
    
    
    return {
        add_event : add_event
    ,   remove_event : remove_event
    };
} )();


var add_event = event_functions.add_event,
    remove_event = event_functions.remove_event;


function get_img_extension( img_url, extension_list ) {
    var extension = '',
        extension_list = ( extension_list ) ? extension_list : [ 'png', 'jpg', 'gif' ];
    
    if ( img_url.match( new RegExp( '\.(' + extension_list.join('|') + ')' ) ) ) {
        extension = RegExp.$1;
    }
    return extension;
} // end of get_img_extension()


function get_img_kind( img_url ) {
    var kind = 'medium';
    
    if ( img_url.match( /:(\w*)$/ ) ) {
        kind = RegExp.$1;
    }
    return kind;
} // end of get_img_kind()


function get_img_url( img_url, kind ) {
    if ( ! kind ) {
        kind = '';
    }
    else {
        if ( kind.search( ':' ) != 0 ) {
            kind = ':' + kind;
        }
    }
    return img_url.replace( /:\w*$/, '' ) + kind;
} // end of get_img_url()


function get_img_url_orig( img_url ) {
    if ( /^https?:\/\/ton\.twitter\.com\//.test( img_url ) ) {
        // DM の画像は :orig が付かないものが最大
        return get_img_url( img_url );
    }
    return get_img_url( img_url, 'orig' );
} // end of get_img_url_orig()


function get_img_filename( img_url ) {
    return img_url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '$1-$3.$2' );
} // end of get_img_filename()


function get_timestamp_ms_from_tweet_id( tweet_id ) {
    if ( isNaN( tweet_id ) ) {
        return null;
    }
    tweet_id = parseInt( tweet_id, 10 );
    
    if ( tweet_id <= 30000000000 ) {
        return null;
    }
    return ( 1288834974657 + ( tweet_id / ( 1 << 22 ) ) );
} // end of get_timestamp_ms_from_tweet_id()


function get_timestamp_ms_from_tweet_url( tweet_url ) {
    if ( tweet_url.match( /^(?:https?:\/\/twitter\.com)?\/[^\/]+\/status(?:es)?\/(\d+).*$/ ) ) {
        return get_timestamp_ms_from_tweet_id( RegExp.$1 );
    }
    return null;
} // end of get_timestamp_ms_from_tweet_url()


function get_datetime_string_from_timestamp_ms( timestamp_ms ) {
    if ( ( ! timestamp_ms ) || isNaN( timestamp_ms ) ) {
        return '';
    }
    return ( new Date( parseInt( timestamp_ms, 10 ) ).toLocaleString() );
} // end of get_datetime_string_from_timestamp_ms()


var DragScroll = {
    is_dragging : false
,   element : null
,   mouse_x : 0
,   mouse_y : 0


,   init : function ( element ) {
        var self = this;
        
        self.element = element;
        
        return self;
    
    } // end of init()


,   start : function () {
        var self = this,
            element = self.element;
        
        self._add_event( element, 'mousedown', self._drag_start, true );
        self._add_event( element, 'mousemove', self._drag_move, true );
        
        return self;
    } // end of start()


,   stop : function () {
        var self = this,
            element = self.element;
        
        self._remove_event( self.element, 'mousemove' );
        self._remove_event( self.element, 'mousedown' );
        
        return self;
    } // end of stop()


,   _add_event : function ( target, event_name, event_function ) {
        var self = this;
        
        add_event.apply( self, arguments );
    } // end of _add_event()


,   _remove_event : function ( target, event_name, event_function ) {
        var self = this;
        
        remove_event.apply( self, arguments );
    } // end of _remove_event()


,   _drag_start : function ( event ) {
        var self = this,
            element = self.element;
        
        if ( self.is_dragging ) {
            return;
        }
        self.is_dragging = true;
        
        var mouse_position = get_mouse_position( event );
        
        self.mouse_x = mouse_position.x;
        self.mouse_y = mouse_position.y;
        
        w.getSelection().removeAllRanges();
    } // end of _drag_start()


,   _drag_stop : function ( event ) {
        var self = this,
            element = self.element;
        
        self.is_dragging = false;
        
        w.getSelection().removeAllRanges();
    } // end of _drag_stop()


,   _drag_move : function ( event ) {
        var self = this,
            element = self.element;
        
        if ( ! self.is_dragging ) {
            return;
        }
        
        if ( ! event.buttons ) {
            self._drag_stop( event );
            return;
        }
        
        var mouse_position = get_mouse_position( event ),
            dx = mouse_position.x - self.mouse_x,
            dy = mouse_position.y - self.mouse_y;
        
        element.scrollLeft -= dx;
        element.scrollTop -= dy;
        
        self.mouse_x = mouse_position.x;
        self.mouse_y = mouse_position.y;
        
        w.getSelection().removeAllRanges();
    } // end of _drag_move()
};


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
    link_style.minWidth = '90px';
    
    function create_download_link( img_url, doc ) {
        if ( ! doc ) {
            doc = d;
        }
        
        var link = import_node( link_template, doc ),
            link_style = link.style,
            link_border_color = '#e1e8ed';
        
        link_style.borderColor = link_border_color;
        
        add_event( link, 'mouseover', function ( event ) {
            link_border_color = link_style.borderColor;
            link_style.borderColor = 'red';
        } );
        
        add_event( link, 'mouseout', function ( event ) {
            link_style.borderColor = link_border_color;
        } );
        
        link.appendChild( doc.createTextNode( OPTIONS.DOWNLOAD_HELPER_BUTTON_TEXT ) );
        
        if ( img_url ) {
            var filename = get_img_filename( img_url );
            
            link.href = img_url;
            link.download = filename;
        }
        return link;
    }
    
    return create_download_link;
} )(); // end of create_download_link()


function download_zip( tweet_info_json ) {
    try {
        var tweet_info = JSON.parse( tweet_info_json ),
            tweet_url = tweet_info.url,
            tweet_url = /^http/.test( tweet_url ) ? tweet_url : 'https://twitter.com' + tweet_url,
            title = ( tweet_info.title ) ? tweet_info.title : '',
            fullname = tweet_info.fullname.trim(),
            username = tweet_info.username.trim(),
            timestamp_ms = tweet_info.timestamp_ms,
            img_urls = tweet_info.img_urls;
        
        if ( ( ! tweet_url ) || ( ! img_urls ) || ( img_urls.length <= 0 ) ) {
            return false;
        }
    }
    catch ( error ) {
        return false;
    }
    
    var zip = new JSZip(),
        filename_prefix = tweet_url.replace( /^https?:\/\/twitter\.com\/([^\/]+)\/status(?:es)?\/(\d+).*$/, '$1-$2' ),
        timestamp_ms = ( timestamp_ms ) ? timestamp_ms : get_timestamp_ms_from_tweet_url( tweet_url ),
        datetime_string = get_datetime_string_from_timestamp_ms( timestamp_ms ),
        img_info_dict = {};
    
    if ( filename_prefix == tweet_url ) {
        return false;
    }
    
    zip.file( filename_prefix + '.url', '[InternetShortcut]\nURL=' + tweet_url + '\n' );
    
    if ( fullname && username ) {
        zip.file( filename_prefix + '.txt', [
            fullname + ' (' + username + ') ' + datetime_string
        ,   tweet_url
        ,   title
        ,   img_urls.join( '\n' )
        ].join( '\n\n' ) + '\n' );
    }
    
    
    function save_blob( filename, blob ) {
        function _save() {
            var blobURL = URL.createObjectURL( blob ),
                download_button = document.createElement( 'a' );
            
            download_button.href = blobURL;
            download_button.download = filename;
            
            document.documentElement.appendChild( download_button );
            
            download_button.click();
            
            download_button.parentNode.removeChild( download_button );
        } // end of _save()
        
        if ( typeof saveAs == 'function' ) {
            try {
                saveAs( blob, filename );
            }
            catch ( error ) {
                //console.error( error );
                _save();
            }
        }
        else {
            _save();
        }
    } // end of save_blob()
    
    
    function add_img_info( img_url, arrayBuffer ) {
        var img_info = {
                filename : get_img_filename( img_url )
            ,   arrayBuffer : ( arrayBuffer ) ? arrayBuffer : ''
            };
        
        img_info_dict[ img_url ] = img_info;
        
        if ( Object.keys( img_info_dict ).length < img_urls.length ) {
            return;
        }
        
        img_urls.forEach( function ( img_url, index ) {
            var img_info = img_info_dict[ img_url ],
                img_extension = get_img_extension( img_info.filename ),
                //img_filename = img_info.filename;
                img_filename = filename_prefix + '-img' + ( index + 1 ) + '.' + img_extension;
            
            if ( ! img_extension ) {
                return;
            }
            zip.file( img_filename, img_info.arrayBuffer );
        } );
        
        var zip_content_type = 'blob';
            // ※ JSZip 自体は 'base64' 等もサポートしている [generateAsync(options[, onUpdate])](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html)
            // ※ 'base64' の場合、'data:application/zip;base64,' + zip_content でデータ URL を作成できるが、これでダウンロードすると、 Chrome ではセキュリティの警告が出て削除されてしまう
        
        zip.generateAsync( { type : zip_content_type } ).then( function ( zip_content ) {
            var zip_filename = filename_prefix + '.zip';
            
            save_blob( zip_filename, zip_content );
            
            if ( w.opener && ( w === top ) ) {
                setTimeout( function () {
                    w.close();
                }, 1000 );
            }
        } );
    } // end of add_img_info()
    
    
    img_urls.forEach( function ( img_url ) {
        if ( ( ! /^https?:\/\/pbs\.twimg\.com\/media\//.test( img_url ) ) || ( img_url == get_img_filename( img_url ) ) ) {
            return;
        }
        
        if ( is_firefox() && ( typeof GM_xmlhttpRequest == 'function' ) ) {
            GM_xmlhttpRequest( {
                method : 'GET'
            ,   url : img_url
            ,   responseType : 'arraybuffer'
            ,   onload : function ( response ) {
                    add_img_info( img_url, response.response );
                }
            ,   onerror : function ( response ) {
                    console.error( response.status, response.statusText );
                    add_img_info( img_url );
                }
            } );
        }
        else {
            var xhr = new XMLHttpRequest();
            
            xhr.open( 'GET', img_url, true );
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
                if ( xhr.readyState != 4 ) {
                    return;
                }
                if ( xhr.status != 200 ) {
                    console.error( xhr.status, xhr.statusText );
                    return;
                }
                add_img_info( img_url, xhr.response );
            };
            xhr.onerror = function () {
                console.error( xhr.status, xhr.statusText );
                add_img_info( img_url );
            };
            xhr.send();
        }
    } );
    
    return true;
} // end of download_zip()


function initialize_download_helper() {
    if ( ! ( w.location.href.match( /^https?:\/\/pbs\.twimg\.com\/media\// ) ) ) {
        return false;
    }
    
    if ( ! OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID ) {
        return true;
    }
    
    var img_url = w.location.href,
        is_child = /^https?:\/\/(?:tweetdeck\.)?twitter\.com\//.test( d.referrer ),
        link = ( is_ie() ) ? null : create_download_link( img_url );
    
    if ( link && is_child ) {
        // TODO: 第三者のサイト上であっても、window.name にフォーマットにあった値を設定されてしまうと、指定通りに保存されてしまう
        // →暫定的に、referrer 確認で対処
        
        if ( w.name == SCRIPT_NAME + '_download_frame' ) {
            // 本スクリプトによりダウンロード用 IFRAME 経由で開いた場合
            d.documentElement.appendChild( link );
            
            link.click(); // ダウンロード開始
            
            link.parentNode.removeChild( link );
            
            return true;
        }
        
        try {
            var tweet_info_json = decodeURIComponent( w.name );
            
            if ( /^https?:\/\/(?:tweetdeck\.)?twitter\.com\//.test( d.referrer ) && download_zip( tweet_info_json ) ) {
                return true;
            }
        }
        catch ( error ) {
            //console.log( error );
        }
    }
    
    if ( d.querySelector( 'form.search-404' ) ) {
        var extension_list = [ 'png', 'jpg', 'gif' ],
            current_extension = get_img_extension( img_url, extension_list );
        
        if ( ! current_extension ) {
            return;
        }
        
        extension_list.forEach( function( extension ) {
            if ( current_extension == extension ) {
                return;
            }
            var try_img = new Image(),
                try_url = img_url.replace( '.' + current_extension, '.' + extension );
            
            add_event( try_img, 'load', function ( event ) {
                w.location.replace( try_url );
            } );
            
            try {
                try_img.src = try_url;
            }
            catch ( error ) {
                //console.error( error );
                // TODO: Firefox だとうまくいかない
                // Content Security Policy: ページの設定により次のリソースの読み込みをブロックしました: (try_url) ("img-src https://abs.twimg.com https://ssl.google-analytics.com http://www.google-analytics.com")
            }
        } );
        
        return;
    }
    
    // 通常の window(top) として開いた場合、もしくは本スクリプトにより window.open() で開いた場合
    var link_container = d.createElement( 'div' ),
        link_container_style = link_container.style,
        kind_list = [ 'thumb', 'small', 'medium', 'large', 'orig' ],
        current_kind = get_img_kind( img_url ),
        fadeout = true,
        initial_fadeout_limit_msec = 1500,
        default_fadeout_limit_msec = 500,
        fadeout_unit_msec = 100,
        timerid = null,
        fadeout_later_timerid = null;
        
    
    link_container_style.position = 'fixed';
    link_container_style.zIndex = 10000;
    link_container_style.width = '100%';
    //link_container_style.margin = '2px 0 1px 0';
    link_container_style.margin = '0 0 0 0';
    link_container_style.fontFamily = 'Arial, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", Osaka, メイリオ, Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", sans-serif';
    link_container_style.padding = '2px 4px';
    link_container_style.opacity = '1.0';
    link_container_style.background = 'lightyellow';
    link_container_style.border = 'solid 1px silver';
    
    if ( link ) {
        link.style.marginRight = '6px';
        link_container.appendChild( link );
        
        add_event( d.body, 'keydown', function ( event ) {
            var key_code = event.keyCode;
            
            switch ( key_code ) {
                case 68 : // [d]
                    link.click(); // ダウンロード開始
                    break;
            }
        } );
    }
    
    kind_list.forEach( function ( kind ) {
        var kind_link = d.createElement( 'a' ),
            kind_link_style = kind_link.style;
        
        if ( kind == current_kind ) {
            kind_link_style.color = 'olive';
        }
        else {
            kind_link.href = get_img_url( img_url, kind );
        }
        kind_link_style.fontSize = '14px';
        kind_link_style.fontWeight = 'bolder';
        kind_link_style.background = 'white';
        kind_link_style.margin = '0 2px';
        kind_link_style.padding = '2px 4px';
        kind_link.appendChild( d.createTextNode( kind ) );
        
        link_container.appendChild( kind_link );
    } );
    
    
    function clear_fadeout_later_timer() {
        if ( ! fadeout_later_timerid ) {
            return;
        }
        
        clearTimeout( fadeout_later_timerid );
        fadeout_later_timerid = null;
    } // end of clear_fadeout_later_timer()
    
    
    function start_fadeout( fadeout_limit_msec ) {
        function clear_timer() {
            if ( ! timerid ) {
                return;
            }
            
            clearInterval( timerid );
            timerid = null;
        } // end of clear_timer()
        
        
        if ( ! fadeout_limit_msec ) {
            fadeout_limit_msec = default_fadeout_limit_msec;
        }
        
        clear_timer();
        fadeout = true;
        link_container_style.opacity = '1.0';
        
        var current_msec = fadeout_limit_msec;
        
        timerid = setInterval( function () {
            if ( ! fadeout ) {
                clear_timer();
                return;
            }
            current_msec -= fadeout_unit_msec;
            
            if ( current_msec <= 0 ) {
                clear_timer();
                link_container_style.opacity = '0.0';
                fadeout = false;
                return;
            }
            
            if ( current_msec < default_fadeout_limit_msec ) {
                link_container_style.opacity = current_msec / default_fadeout_limit_msec;
            }
        }, fadeout_unit_msec );
        
    } // end of start_fadeout()
    
    /*
    //add_event( d.body, 'mousemove', function ( event ) {
    //    fadeout = false;
    //    link_container_style.opacity = '1.0';
    //    
    //    clear_fadeout_later_timer();
    //    fadeout_later_timerid = setTimeout( function() {
    //        start_fadeout();
    //    }, 100 );
    //} );
    */
    
    add_event( link_container, 'mouseover', function ( event ) {
        event.stopPropagation();
        clear_fadeout_later_timer();
        fadeout = false;
        link_container_style.opacity = '1.0';
    } );
    
    add_event( link_container, 'mousemove', function ( event ) {
        event.stopPropagation();
        clear_fadeout_later_timer();
        fadeout = false;
        link_container_style.opacity = '1.0';
    } );
    
    add_event( link_container, 'mouseout', function ( event ) {
        clear_fadeout_later_timer();
        fadeout_later_timerid = setTimeout( function() {
            start_fadeout();
        }, 300 );
    } );
    
    start_fadeout( initial_fadeout_limit_msec );
    
    d.body.insertBefore( link_container, d.body.firstChild );
    
    /*
    //var img_shrink_to_fit = d.querySelector( 'img.shrinkToFit' );
    //
    //if ( img_shrink_to_fit ) {
    //    // Firefox 対策（画像が position: absolute; top: 0; なので、リンクが隠れてしまう）
    //    img_shrink_to_fit.style.top = '34px';
    //}
    */
    
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
    
    if ( is_ie() || is_bookmarklet() ) {
        OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID = false;
    }
    
    if ( typeof JSZip != 'function' ) {
        OPTIONS.DOWNLOAD_ZIP_IS_VALID = false;
    }
    
    if ( initialize_download_helper() !== false ) {
        return;
    }
    
    if ( w !== parent ) {
        return;
    }
    
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
    
    
    var add_open_button = ( function () {
        var button_container_classname = SCRIPT_NAME + 'Button',
            opened_name_map = {},
            
            MouseClick = {
                move_count : 0
            ,   fullscreen_container_width_scrollbar : null
            ,   element : null
            ,   start_mouse_position : { x : 0, y : 0 }
            
            
            ,   init : function ( element, fullscreen_container_width_scrollbar ) {
                    var self = this;
                    
                    self.element = element;
                    self.fullscreen_container_width_scrollbar = fullscreen_container_width_scrollbar;
                    
                    return self;
                } // end of init()
            
            
            ,   start : function ( click_function ) {
                    var self = this,
                        element = self.element;
                    
                    self.click_function = click_function;
                    
                    self._add_event( element, 'click', self._click, true );
                    self._add_event( element, 'mousedown', self._mousedown, true );
                    self._add_event( element, 'mousemove', self._mousemove, true );
                    self._add_event( element, 'mouseup', self._mouseup, true );
                    self._add_event( element, 'MouseClick', self._do_click_function, true );
                    
                    return self;
                } // end of start()
            
            
            ,   stop : function () {
                    var self = this,
                        element = self.element;
                    
                    self._remove_event( element, 'MouseClick' );
                    self._remove_event( element, 'mouseup' );
                    self._remove_event( element, 'mousemove' );
                    self._remove_event( element, 'mousedown' );
                    self._remove_event( element, 'click' );
                    
                    return self;
                } // end of start()
            
            
            ,   _add_event : function ( target, event_name, event_function ) {
                    var self = this;
                    
                    add_event.apply( self, arguments );
                } // end of _add_event()
            
            
            ,   _remove_event : function ( target, event_name, event_function ) {
                    var self = this;
                    
                    remove_event.apply( self, arguments );
                } // end of _remove_event()
            
            
            ,   _mouse_is_on_scrollbar : function ( event ) {
                    var self = this,
                        fullscreen_container_width_scrollbar = self.fullscreen_container_width_scrollbar;
                    
                    if ( ! fullscreen_container_width_scrollbar ) {
                        return false;
                    }
                    
                    var mouse_x = event.clientX,
                        mouse_y = event.clientY,
                        max_x = fullscreen_container_width_scrollbar.clientWidth,
                        max_y = fullscreen_container_width_scrollbar.clientHeight;
                    
                    if ( ( mouse_x < 0 || max_x <= mouse_x ) || ( mouse_y < 0 || max_y <= mouse_y ) ) {
                        return true;
                    }
                    
                    return false;
                } // end of _mouse_is_on_scrollbar()
            
            
            ,   _do_click_function : function ( event ) {
                    var self = this;
                    
                    if ( typeof self.click_function == 'function' ) {
                        self.click_function.apply( self, arguments );
                    }
                }
            
            ,   _click : function ( event ) {
                    var self = this;
                    
                    // デフォルトのクリックイベントは無効化
                    event.stopPropagation();
                    event.preventDefault();
                }
            
            
            ,   _mousedown : function ( event ) {
                    var self = this;
                    
                    self.move_count = 0;
                    self.start_mouse_position = get_mouse_position( event );
                } // end of _mousedown()
            
            
            ,   _mousemove : function ( event ) {
                    self.move_count ++;
                } // end of _mousemove()
            
            
            ,   _mouseup : function ( event ) {
                    var self = this,
                        start_mouse_position = self.start_mouse_position;
                    
                    if ( event.button != 0 ) {
                        // メインボタン以外
                        return false;
                    }
                    
                    if ( self._mouse_is_on_scrollbar( event ) ) {
                        return false;
                    }
                    
                    var stop_mouse_position = get_mouse_position( event );
                    
                    if ( 10 < Math.max( Math.abs( stop_mouse_position.x - start_mouse_position.x ), Math.abs( stop_mouse_position.y - start_mouse_position.y ) ) ) {
                        return false;
                    }
                    
                    self._do_click_function.apply( self, arguments );
                } // end of _mouseup()
            },
            
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
                img_link_container_style.margin = '0 auto 8px auto';
                img_link_container_style.padding = '0 0 4px 0';
                img_link_container_style.textAlign = 'center';
                
                return img_link_container_template;
            } )(),
            
            help_item_template = ( function () {
                var help_item_template = d.createElement( 'span' ),
                    help_item_template_style = help_item_template.style;
                
                help_item_template_style.className = 'help-item';
                help_item_template_style.marginRight = '4px';
                help_item_template_style.fontSize = '14px';
                help_item_template_style.fontWeight = 'normal';
                help_item_template_style.pointerEvents = 'auto';
                help_item_template_style.cursor = 'pointer';
                
                return help_item_template;
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
                                
                                update_overlay_status( target_container );
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
                        
                        
                        function image_overlay_container_horizontal_scroll_to( options ) {
                            var options = ( options ) ? options : {},
                                offset = options.offset,
                                lock_after_scroll = options.lock_after_scroll;
                            
                            if ( lock_after_scroll ) {
                                // スクロール完了後にウェイトを設ける(mousemove等のイベントをすぐには発火させないため)
                                lock_mouseover();
                            }
                            image_overlay_container.scrollLeft = offset;
                        } // end of image_overlay_container_horizontal_scroll_to()
                        
                        
                        function image_overlay_container_scroll_step( step ) {
                            image_overlay_container_scroll_to( {
                                offset : image_overlay_container.scrollTop + step
                            } );
                        } // end of image_overlay_container_scroll_step()
                        
                        
                        function image_overlay_container_horizontal_scroll_step( step ) {
                            image_overlay_container_horizontal_scroll_to( {
                                offset : image_overlay_container.scrollLeft + step
                            } );
                        } // end of image_overlay_container_horizontal_scroll_step()
                        
                        
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
                                var image_link = image_link_container.querySelector( '.image-link' ),
                                    original_image = image_link.querySelector( '.original-image' ),
                                    mouse_click = object_extender( MouseClick );
                                
                                
                                function disable_event( event ) {
                                    event.stopPropagation();
                                    event.preventDefault();
                                } // end of disable_event( event );
                                
                                
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
                                
                                
                                original_image.setAttribute( 'draggable', false );
                                add_event( original_image, 'dragstart', disable_event );
                                
                                image_link.setAttribute( 'draggable', false );
                                add_event( image_link, 'dragstart', disable_event );
                                
                                mouse_click.init( image_link, image_overlay_container ).start( set_focus );
                                add_event( image_link_container, 'mouseover', set_focus_mouseover );
                                add_event( image_link_container, 'mousemove', set_focus_mouseover );
                                add_event( image_link_container, 'remove-mouse-click-event', function ( event ) {
                                    mouse_click.stop();
                                    
                                    var download_link = image_link_container.querySelector( '.download-link' );
                                    
                                    if ( download_link ) {
                                        fire_event( download_link, 'remove-mouse-click-event-download' );
                                    }
                                } );
                            } );
                            
                            fire_event( image_overlay_container, 'toggle-image-size' );
                            
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
                                fire_event( download_link, 'MouseClick' );
                            }
                        } // end of image_overlay_container_download_current_image()
                        
                        
                        function image_overlay_container_download_image_zip() {
                            var tweet_url = image_overlay_close_link.href,
                                //img_urls = to_array( image_overlay_container.querySelectorAll( '.image-link-container .download-link' ) ).map( function ( download_link ) {
                                //    return download_link.href;
                                //} ),
                                img_urls = JSON.parse( decodeURIComponent( image_overlay_close_link.getAttribute( 'data-all-img-urls' ) ) ),
                                tweet_info_json = JSON.stringify( {
                                    url : tweet_url
                                ,   img_urls : img_urls
                                ,   title : image_overlay_close_link.title
                                ,   fullname : image_overlay_close_link.getAttribute( 'data-fullname' )
                                ,   username : image_overlay_close_link.getAttribute( 'data-username' )
                                ,   timestamp_ms : image_overlay_close_link.getAttribute( 'data-timestamp-ms' )
                                } );
                            
                            if ( is_firefox() ) {
                                // TODO: Firefox の場合、IFRAME 経由で呼び出すと、ダウンロード用の a#href に blob:～ を入れた時点で CSP に引っかかってしまう
                                // →対策として、cross-domain 対応の GM_xmlhttpRequest を使用し、IFRAME 経由ではなく直接呼び出し
                                
                                if ( typeof GM_xmlhttpRequest == 'function' ) {
                                    download_zip( tweet_info_json );
                                }
                                else {
                                    w.open( img_urls[ 0 ], encodeURIComponent( tweet_info_json ) );
                                }
                                return false;
                            }
                            
                            var old_iframe = d.querySelector( 'iframe#' + SCRIPT_NAME + '_download_zip_frame' ),
                                iframe = import_node( download_frame_template );
                            
                            
                            if ( old_iframe ) {
                                old_iframe.parentNode.removeChild( old_iframe );
                                old_iframe = null;
                            }
                            iframe.id = SCRIPT_NAME + '_download_zip_frame';
                            iframe.name = encodeURIComponent( tweet_info_json );
                            iframe.src = img_urls[ 0 ];
                            d.documentElement.appendChild( iframe );
                        } // end of image_overlay_container_download_image_zip()
                        
                        
                        add_event( image_overlay_container, 'lock-mouseover', function() {
                            lock_mouseover();
                        } );
                        
                        add_event( image_overlay_container, 'scroll-to-top', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_to( {
                                offset : 0
                            } );
                        } );
                        
                        add_event( image_overlay_container, 'scroll-to-bottom', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_to( {
                                offset : image_overlay_container.scrollHeight
                            } );
                        } );
                        
                        add_event( image_overlay_container, 'smooth-scroll-to-top', function () {
                            clear_timerid_list();
                            image_overlay_container_smooth_scroll( {
                                scroll_height : image_overlay_container.scrollTop
                            ,   step : - OPTIONS.SMOOTH_SCROLL_STEP
                            } );
                        } );
                        
                        add_event( image_overlay_container, 'smooth-scroll-to-bottom', function () {
                            clear_timerid_list();
                            image_overlay_container_smooth_scroll( {
                                scroll_height : image_overlay_container.scrollHeight - image_overlay_container.scrollTop
                            ,   step : OPTIONS.SMOOTH_SCROLL_STEP
                            } );
                        } );
                        
                        add_event( image_overlay_container, 'scroll-to-horizontal-middle', function () {
                            clear_timerid_list();
                            
                            if ( w.innerWidth < image_overlay_container.scrollWidth ) {
                                image_overlay_container_horizontal_scroll_to( {
                                    offset : ( image_overlay_container.scrollWidth - w.innerWidth ) / 2
                                } );
                            }
                        } );
                        
                        add_event( image_overlay_container, 'scroll-to-current-image-container', function () {
                            clear_timerid_list();
                            
                            set_image_container_to_current( image_overlay_container.querySelector( '.image-link-container.current' ), {
                                scroll_to : true
                            ,   smooth_scroll : true
                            } );
                        } );
                        
                        add_event( image_overlay_container, 'scroll-down', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_step( OPTIONS.SCROLL_STEP );
                        } );
                        
                        add_event( image_overlay_container, 'scroll-up', function () {
                            clear_timerid_list();
                            image_overlay_container_scroll_step( - OPTIONS.SCROLL_STEP );
                        } );
                        
                        add_event( image_overlay_container, 'scroll-left', function () {
                            clear_timerid_list();
                            image_overlay_container_horizontal_scroll_step( - OPTIONS.SCROLL_STEP );
                        } );
                        
                        add_event( image_overlay_container, 'scroll-right', function () {
                            clear_timerid_list();
                            image_overlay_container_horizontal_scroll_step( OPTIONS.SCROLL_STEP );
                        } );
                        
                        add_event( image_overlay_container, 'page-up', function () {
                            clear_timerid_list();
                            image_overlay_container_page_step( -1 );
                        } );
                        
                        add_event( image_overlay_container, 'page-down', function () {
                            clear_timerid_list();
                            image_overlay_container_page_step();
                        } );
                        
                        add_event( image_overlay_container, 'image-init', function () {
                            clear_timerid_list();
                            image_overlay_container_image_init();
                        } );
                        
                        add_event( image_overlay_container, 'image-next', function () {
                            clear_timerid_list();
                            image_overlay_container_image_step();
                        } );
                        
                        add_event( image_overlay_container, 'image-prev', function () {
                            clear_timerid_list();
                            image_overlay_container_image_step( -1 );
                        } );
                        
                        add_event( image_overlay_container, 'download-image', function () {
                            clear_timerid_list();
                            image_overlay_container_download_current_image();
                        } );
                        
                        add_event( image_overlay_container, 'download-image-zip', function () {
                            clear_timerid_list();
                            image_overlay_container_download_image_zip();
                        } );
                        
                        d.body.appendChild( image_overlay_container );
                        
                        return image_overlay_container;
                    } )(),
                    
                    image_overlay_loading = ( function () {
                        var image_overlay_loading = d.createElement( 'div' ),
                            image_overlay_loading_style = image_overlay_loading.style,
                            loading = d.createElement( 'img' ),
                            loading_style = loading.style;
                        
                        image_overlay_loading.id = SCRIPT_NAME + '_image_overlay_loading';
                        image_overlay_loading_style.display = 'none';
                        image_overlay_loading_style.pointerEvents = 'none';
                        image_overlay_loading_style.position = 'fixed';
                        image_overlay_loading_style.top = 0;
                        image_overlay_loading_style.right = 0;
                        image_overlay_loading_style.bottom = 0;
                        image_overlay_loading_style.left = 0;
                        image_overlay_loading_style.zIndex = 10010;
                        image_overlay_loading_style.background = 'rgba( 255, 255, 255, 0.8 )';
                        
                        loading.src = 'https://abs.twimg.com/a/1460504487/img/t1/spinner-rosetta-gray-32x32.gif';
                        loading_style.position = 'absolute';
                        loading_style.top = 0;
                        loading_style.right = 0;
                        loading_style.bottom = 0;
                        loading_style.left = 0;
                        loading_style.margin = 'auto';
                        loading_style.opacity = 0.8;
                        
                        image_overlay_loading.appendChild( loading );
                        
                        d.body.appendChild( image_overlay_loading );
                        
                        return image_overlay_loading;
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
                        image_overlay_header_style.zIndex = 10020;
                        
                        image_overlay_header.appendChild( image_overlay_shortcut_help );
                        image_overlay_header.appendChild( image_overlay_status_container );
                        image_overlay_header.appendChild( image_overlay_close_link );
                        
                        d.body.appendChild( image_overlay_header );
                        
                        return image_overlay_header;
                    } )(),
                    
                    image_overlay_drag_scroll = object_extender( DragScroll ).init( image_overlay_container );
                
                return {
                    container : image_overlay_container
                ,   image_container : image_overlay_image_container
                ,   loading : image_overlay_loading
                ,   header : image_overlay_header
                ,   close_link : image_overlay_close_link
                ,   status_container : image_overlay_status_container
                ,   shortcut_help : image_overlay_shortcut_help
                ,   drag_scroll : image_overlay_drag_scroll
                }
            } )(),
            
            image_overlay_container = image_overlay.container,
            image_overlay_image_container = image_overlay.image_container,
            image_overlay_loading = image_overlay.loading,
            image_overlay_header = image_overlay.header,
            image_overlay_close_link = image_overlay.close_link,
            image_overlay_status_container = image_overlay.status_container,
            image_overlay_shortcut_help = image_overlay.shortcut_help,
            image_overlay_drag_scroll = image_overlay.drag_scroll;
        
        
        function mouse_is_on_scrollbar( event ) {
            var mouse_x = event.clientX,
                mouse_y = event.clientY,
                max_x = image_overlay_container.clientWidth,
                max_y = image_overlay_container.clientHeight;
            
            if ( ( mouse_x < 0 || max_x <= mouse_x ) || ( mouse_y < 0 || max_y <= mouse_y ) ) {
                return true;
            }
            
            return false;
        } // end of mouse_is_on_scrollbar()
        
        
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
                
                if ( OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID ) {
                    var download_link = create_download_link( img_url, target_document ),
                        download_link_container = import_node( download_link_container_template, target_document ),
                        mouse_click = object_extender( MouseClick ).init( download_link );
                    
                    download_link.href = img_url;
                    
                    if ( is_bookmarklet() ) {
                        mouse_click.start( function ( event ) {
                            event.stopPropagation();
                        } );
                    }
                    else {
                        mouse_click.start( function ( event ) {
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
                        } );
                    }
                    
                    add_event( download_link, 'remove-mouse-click-event-download', function ( event ) {
                        mouse_click.stop();
                    } );
                    
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
                
                add_event( img, 'load', check_loaded_image );
                add_event( img, 'error', check_loaded_image );
                
                img.src = link.href = img_url;
                
                link.className = 'image-link';
                link.appendChild( img );
                
                add_event( link, 'click', function ( event ) {
                    event.stopPropagation();
                } );
                
                img_link_container.appendChild( link );
                
                if ( img_url == start_img_url ) {
                    img_link_container.classList.add( 'start' );
                }
                img_link_container.setAttribute( 'data-image-number', index + 1 );
                img_link_container.setAttribute( 'data-image-total', img_urls.length );
                parent.appendChild( img_link_container );
            } );
        } // end of add_images_to_page()
        
        
        function update_overlay_status( target_container ) {
            if ( ! target_container ) {
                return;
            }
            clear_node( image_overlay_status_container );
            image_overlay_status_container.appendChild( d.createTextNode( target_container.getAttribute( 'data-image-number' ) + ' / ' + target_container.getAttribute( 'data-image-total' ) ) );
        } // end of update_overlay_status()
        
        
        function show_overlay( img_urls, tweet_url, title, start_img_url, tweet, all_img_urls ) {
            if ( image_overlay_container.style.display != 'none' ) {
                //console.error( 'show_overlay(): duplicate called' );
                // TODO: 重複して呼ばれるケース(不正な動作)に対するガード
                return;
            }
            
            var html_element = d.querySelector( 'html' ),
                body = d.body,
                fullname_container = tweet.querySelector( '.fullname' ),
                fullname = ( fullname_container ) ? fullname_container.textContent.trim() : '',
                username_container = tweet.querySelector( '.username' ),
                username = ( username_container ) ? username_container.textContent.trim() : '',
                timestamp_container = tweet.querySelector( '*[data-time-ms], time[data-time]' ),
                timestamp_ms = ( timestamp_container ) ? ( timestamp_container.getAttribute( 'data-time-ms' ) || timestamp_container.getAttribute( 'data-time' ) ) : '',
                
                image_overlay_container_style = image_overlay_container.style,
                image_overlay_loading_style = image_overlay_loading.style,
                image_overlay_header_style = image_overlay_header.style,
                image_overlay_image_container_style = image_overlay_image_container.style,
                html_style = html_element.style,
                body_style = body.style,
                
                saved_html_overflowX = html_style.overflowX,
                saved_html_overflowY = html_style.overflowY,
                saved_body_position = body_style.position,
                saved_body_overflowX = body_style.overflowX,
                saved_body_overflowY = body_style.overflowY,
                saved_body_marginRight = body_style.marginRight,
                
                event_list = [],
                image_overlay_container_mouse_click = object_extender( MouseClick );
            
            
            function add_events() {
                event_list.forEach( function ( event_item ) {
                    add_event( event_item.element,  event_item.name, event_item.func, true );
                } );
                
                image_overlay_container_mouse_click.init( image_overlay_container, image_overlay_container ).start( close_image_overlay_container );
            } // end of set_events()
            
            
            function remove_events() {
                var _event_list = event_list.slice( 0 );
                
                image_overlay_container_mouse_click.stop();
                
                _event_list.reverse();
                _event_list.forEach( function ( event_item ) {
                    remove_event( event_item.element, event_item.name, event_item.func );
                } );
                
                to_array( image_overlay_image_container.querySelectorAll( '.image-link-container' ) ).forEach( function ( image_link_container ) {
                    fire_event( image_link_container, 'remove-mouse-click-event' );
                } );
            } // end of remove_events()
            
            
            function close_image_overlay_container( event ) {
                event.stopPropagation();
                event.preventDefault();
                
                image_overlay_drag_scroll.stop();
                
                fire_event( image_overlay_container, 'scroll-to-top' );
                
                image_overlay_image_container_style.visibility = 'hidden';
                image_overlay_header_style.display = 'none';
                image_overlay_loading_style.display = 'none';
                image_overlay_container_style.display = 'none';
                body_style.marginRight = saved_body_marginRight;
                body_style.overflowX = saved_body_overflowX;
                body_style.overflowY = saved_body_overflowY;
                if ( is_tweetdeck() ) {
                    html_style.overflowX = saved_html_overflowX;
                    html_style.overflowY = saved_html_overflowY;
                }
                
                remove_events();
                
                clear_node( image_overlay_image_container );
                
                return false;
            } // end of close_image_overlay_container()
            
            
            image_overlay_image_container_style.visibility = 'hidden';
            clear_node( image_overlay_image_container );
            
            image_overlay_close_link.href = tweet_url;
            image_overlay_close_link.title = title;
            image_overlay_close_link.setAttribute( 'data-fullname', fullname );
            image_overlay_close_link.setAttribute( 'data-username', username );
            image_overlay_close_link.setAttribute( 'data-timestamp-ms', timestamp_ms );
            image_overlay_close_link.setAttribute( 'data-img-urls', encodeURIComponent( JSON.stringify( img_urls ) ) );
            image_overlay_close_link.setAttribute( 'data-all-img-urls', encodeURIComponent( JSON.stringify( all_img_urls ) ) );
            
            add_images_to_page( img_urls, image_overlay_image_container, {
                start_img_url : start_img_url
            ,   callback : function () {
                    if ( image_overlay_container.style.display == 'none' ) {
                        return;
                    }
                    image_overlay_loading_style.display = 'none';
                    fire_event( image_overlay_container, 'image-init' );
                }
            } );
            
            update_overlay_status( image_overlay_container.querySelector( '.image-link-container.start' ) );
            
            clear_node( image_overlay_shortcut_help );
            
            if ( 1 < image_overlay_image_container.querySelectorAll( '.image-link-container' ).length ) {
                var help_move_next = import_node( help_item_template ),
                    help_move_previous = import_node( help_item_template );
                
                help_move_next.classList.add( 'help-move-next' );
                help_move_next.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE_NEXT ) );
                add_event( help_move_next, 'click', function ( event ) {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    fire_event( image_overlay_container, 'image-next' );
                    
                    return false;
                } );
                
                image_overlay_shortcut_help.appendChild( help_move_next );
                
                help_move_previous.classList.add( 'help-move-previous' );
                help_move_previous.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_MOVE_PREVIOUS ) );
                add_event( help_move_previous, 'click', function ( event ) {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    fire_event( image_overlay_container, 'image-prev' );
                    
                    return false;
                } );
                
                image_overlay_shortcut_help.appendChild( help_move_previous );
            }
            
            if ( OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID && tweet_url ) {
                var help_download = import_node( help_item_template );
                
                help_download.classList.add( 'help-download' );
                help_download.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD ) );
                
                add_event( help_download, 'click', function ( event ) {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    fire_event( image_overlay_container, 'download-image' );
                    
                    return false;
                } );
                
                image_overlay_shortcut_help.appendChild( help_download );
            }
            
            if ( OPTIONS.DOWNLOAD_HELPER_SCRIPT_IS_VALID && OPTIONS.DOWNLOAD_ZIP_IS_VALID && tweet_url ) {
                var help_download_zip = import_node( help_item_template );
                
                help_download_zip.classList.add( 'help-download-zip' );
                help_download_zip.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_DOWNLOAD_ZIP ) );
                
                add_event( help_download_zip, 'click', function ( event ) {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    fire_event( image_overlay_container, 'download-image-zip' );
                    
                    return false;
                } );
                
                image_overlay_shortcut_help.appendChild( help_download_zip );
            }
            
            var toggle_image_size = ( function () {
                var image_size_types = {
                        'fit-width' : 'full'
                    ,   'full' : 'fit-height'
                    ,   'fit-height' : 'fit-width'
                    },
                    help_image_size_types = {
                        'fit-width' : 'HELP_OVERLAY_SHORTCUT_SIZE_FIT_WIDTH'
                    ,   'full' : 'HELP_OVERLAY_SHORTCUT_SIZE_FULL'
                    ,   'fit-height' : 'HELP_OVERLAY_SHORTCUT_SIZE_FIT_HEIGHT'
                    },
                    image_size = ( localStorage[ SCRIPT_NAME + '_saved_image_size' ] ) ? localStorage[ SCRIPT_NAME + '_saved_image_size' ] : OPTIONS.DEFAULT_IMAGE_SIZE,
                    help = import_node( help_item_template ),
                    first_event = true;
                
                if ( ! image_size_types[ image_size ] ) {
                    image_size = OPTIONS.DEFAULT_IMAGE_SIZE;
                }
                
                help.classList.add( 'help-toggle-size' );
                
                add_event( help, 'click', function ( event ) {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    fire_event( image_overlay_container, 'toggle-image-size' );
                    
                    return false;
                } );
                
                image_overlay_shortcut_help.appendChild( help );
                
                add_event( image_overlay_container, 'image-fit-height', function ( event ) {
                    if ( image_size != 'fit-height' ) {
                        return false;
                    }
                    
                    var first_image = image_overlay_image_container.querySelector( 'img.original-image' );
                    
                    if ( ! first_image ) {
                        return false;
                    }
                    
                    var first_element_top_offset = parseInt( getComputedStyle( image_overlay_container ).paddingTop ) + get_element_position( first_image ).y - get_element_position( image_overlay_image_container ).y,
                        maxHeight = w.innerHeight - first_element_top_offset - 20 // TODO: スクロールバーの幅分を自動で調整したい
                    
                    to_array( image_overlay_image_container.querySelectorAll( 'img.original-image' ) ).forEach( function ( img ) {
                        img.style.maxHeight = maxHeight + 'px';
                    } );
                    
                    return false;
                } );
                
                add_event( w, 'resize', function ( event ) {
                    if ( image_size != 'fit-height' ) {
                        return false;
                    }
                    
                    setTimeout( function () {
                        fire_event( image_overlay_container, 'image-fit-height' );
                    }, 100 );
                    
                    return false;
                } );
                
                
                function get_next_size( image_size ) {
                    if ( image_size_types[ image_size ] ) {
                        return image_size_types[ image_size ];
                    }
                    return OPTIONS.DEFAULT_IMAGE_SIZE;
                } // end of next_size()
                
                
                function change_size( next_size ) {
                    var width_max = 0;
                    
                    to_array( image_overlay_image_container.querySelectorAll( 'img.original-image' ) ).forEach( function ( img ) {
                        if ( width_max < img.naturalWidth ) {
                            width_max = img.naturalWidth;
                        }
                        
                        switch ( next_size ) {
                            case 'fit-width' :
                                img.style.width = 'auto';
                                img.style.height = 'auto';
                                img.style.maxWidth = '100%';
                                img.style.maxHeight = 'none';
                                break;
                            case 'full' :
                                img.style.width = 'auto';
                                img.style.height = 'auto';
                                img.style.maxWidth = 'none';
                                img.style.maxHeight = 'none';
                                break;
                            case 'fit-height' :
                                img.style.width = 'auto';
                                img.style.height = 'auto';
                                img.style.maxWidth = 'none';
                                img.style.maxHeight = 'none';
                                break;
                        }
                    } );
                    
                    to_array( image_overlay_image_container.querySelectorAll( '.image-link-container' ) ).forEach( function ( image_link_container ) {
                        switch ( next_size ) {
                            case 'fit-width' :
                                image_link_container.style.width = 'auto';
                                image_link_container.style.height = 'auto';
                                break;
                            case 'full' :
                                image_link_container.style.width = width_max + 'px';
                                image_link_container.style.height = 'auto';
                                break;
                            case 'fit-height' :
                                image_link_container.style.width = 'auto';
                                image_link_container.style.height = 'auto';
                                break;
                        }
                    } );
                    
                    clear_node( help );
                    help.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_SIZE + OPTIONS[ help_image_size_types[ next_size ] ] ) );
                    
                    image_size = next_size;
                    
                    fire_event( image_overlay_container, 'lock-mouseover' ); // current 要素を変更しないようにロックしておく
                    
                    setTimeout( function () {
                        if ( image_size == 'fit-height' ) {
                            fire_event( image_overlay_container, 'image-fit-height' );
                        }
                        fire_event( image_overlay_container, 'scroll-to-horizontal-middle' );
                        fire_event( image_overlay_container, 'scroll-to-current-image-container' );
                    }, 100 );
                    
                    localStorage[ SCRIPT_NAME + '_saved_image_size' ] = image_size;
                    
                } // end of change_size()
                
                
                function toggle_image_size( event ) {
                    if ( first_event ) {
                        first_event = false;
                        change_size( image_size );
                    }
                    else {
                        change_size( get_next_size( image_size ) );
                    }
                } // end of toggle_image_size()
                
                return toggle_image_size;
            } )(); // end of toggle_image_size()
            
            
            var toggle_image_background_color = ( function () {
                var image_background_color = OPTIONS.DEFAULT_IMAGE_BACKGROUND_COLOR,
                    help = import_node( help_item_template );
                
                help.classList.add( 'help-toggle-bgcolor' );
                
                add_event( help, 'click', function ( event ) {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    fire_event( image_overlay_container, 'toggle-image-background-color' );
                    
                    return false;
                } );
                
                image_overlay_shortcut_help.appendChild( help );
                
                function change_background_color( background_color ) {
                    to_array( image_overlay_image_container.querySelectorAll( 'img.original-image' ) ).forEach( function ( img ) {
                        img.style.background = background_color;
                    } );
                    
                    clear_node( help );
                    help.appendChild( d.createTextNode( OPTIONS.HELP_OVERLAY_SHORTCUT_BGCOLOR + OPTIONS[ ( background_color == 'black' ) ? 'HELP_OVERLAY_SHORTCUT_BGCOLOR_BLACK' : 'HELP_OVERLAY_SHORTCUT_BGCOLOR_WHITE' ] ) );
                    
                    image_background_color = background_color;
                } // end of change_help()
                
                change_background_color( image_background_color );
                
                function toggle_image_background_color( event ) {
                    change_background_color( ( image_background_color == 'black' ) ? 'white' : 'black' );
                } // end of toggle_image_background_color()
                
                return toggle_image_background_color;
            } )(); // end of toggle_image_background_color()
            
            
            event_list.push( { element : image_overlay_close_link, name : 'click', func : close_image_overlay_container } );
            event_list.push( { element : image_overlay_header, name : 'click', func : close_image_overlay_container } );
            event_list.push( { element : image_overlay_container, name : 'toggle-image-size', func : toggle_image_size } );
            event_list.push( { element : image_overlay_container, name : 'toggle-image-background-color', func : toggle_image_background_color } );
            add_events();
            
            if ( is_tweetdeck() ) {
                html_style.overflowX = 'hidden';
                html_style.overflowY = 'hidden';
            }
            body_style.overflowX = 'hidden';
            body_style.overflowY = 'hidden';
            body_style.marginRight = 0;
            image_overlay_header_style.display = 'block';
            image_overlay_loading_style.display = 'block';
            image_overlay_container_style.display = 'block';
            
            image_overlay_drag_scroll.start();
            
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
                //add_event( child_window, 'load', function ( event ) {
                //    page_onload();
                //} );
                
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
            
            function remove_old_button( old_button ) {
                if ( ! old_button ) {
                    return;
                }
                fire_event( old_button, 'remove-all-image-events' );
                if ( ! old_button.classList.contains( 'removed' ) ) {
                    old_button.classList.add( 'removed' );
                }
                if ( old_button.parentNode ) {
                    old_button.parentNode.removeChild( old_button );
                }
                old_button = null;
            } // end of remove_old_button()
            
            
            remove_old_button( old_button );
            
            var gallery = ( is_tweetdeck() && tweet_container.classList.contains( 'js-stream-item' ) ) ? null : search_ancestor( tweet, [ 'Gallery', 'js-modal-panel' ] );
            
            if ( gallery ) {
                old_button = gallery.querySelector( '.' + button_container_classname );
                remove_old_button( old_button );
                old_button = null;
            }
            
            
            function get_img_objects( container ) {
                return to_array( container.querySelectorAll( '.AdaptiveMedia-photoContainer img, a.js-media-image-link img.media-img, div.js-media > div:not(.is-video) a.js-media-image-link[rel="mediaPreview"]' ) ).filter( function ( img_object ) {
                    return ( ! search_ancestor( img_object, [ 'js-quote-detail', 'quoted-tweet' ] ) ); // 引用ツイート中の画像は対象としない
                } );
            } // end of get_img_objects()
            
            
            function get_img_url_from_background( element ) {
                var bgimage = element.style.backgroundImage;
                
                if ( ! bgimage || ! bgimage.match( /url\(['"\s]*(.*?)['"\s]*\)/ ) ) {
                    return null;
                }
                return RegExp.$1;
            } // end of get_img_url_from_background()
            
            
            function get_img_urls( img_objects ) {
                var img_urls = [];
                
                to_array( img_objects ).forEach( function ( img ) {
                    if ( img.src ) {
                        var img_url = get_img_url_orig( img.src );
                        
                        if ( ! /tweetdeck/.test( img_url ) ) {
                            img_urls.push( img_url );
                        }
                    }
                    else if ( img.href ) {
                        var img_url = img.getAttribute( 'data-original-url' ) || get_img_url_from_background( img ) || img.href;
                        
                        if ( img_url && /\.(?:jpg|png|gif)/.test( img_url ) ) {
                            img_url = get_img_url_orig( img_url );
                            img_urls.push( img_url );
                        }
                    }
                } );
                
                return img_urls;
            } // end of get_img_urls()
            
            
            var source_container = ( function () {
                    if ( ( ! is_tweetdeck() ) || ( ! gallery ) ) {
                        return tweet_container;
                    }
                    
                    var data_key_item = gallery.querySelector( '.js-tweet-box[data-key]' );
                    
                    if ( ! data_key_item ) {
                        return tweet_container;
                    }
                    
                    var source_container = d.body.querySelector( 'article.js-stream-item[data-key="' + data_key_item.getAttribute( 'data-key' ) + '"]' );
                        // TODO: TweetDeck の引用ツイートから直接ギャラリーを開いた場合は、source_container が取れない
                    
                    return ( source_container ) ? source_container : tweet_container;
                } )(),
                all_img_objects = get_img_objects( source_container ),
                gallery_media = ( gallery ) ? gallery.querySelector( '.Gallery-media, .js-embeditem' ) : null,
                img_objects = ( gallery_media ) ? gallery_media.querySelectorAll( 'img.media-image, img.media-img, a.med-origlink[href^="https://ton.twitter.com"]' ) : null,
                img_objects = ( img_objects && ( 0 < img_objects.length ) ) ? img_objects : all_img_objects,
                action_list = ( gallery_media ) ? gallery_media.querySelector( '.js-media-preview-container' ) : null,
                action_list = ( action_list ) ? action_list : tweet_container.querySelector( '.ProfileTweet-actionList, footer' ),
                img_urls = [],
                all_img_urls = [];
            
            if ( ( img_objects.length <= 0 ) || ( ! action_list ) ) {
                return null;
            }
            
            img_urls = get_img_urls( img_objects );
            all_img_urls = get_img_urls( all_img_objects );
            
            if ( img_urls.length <= 0 ) {
                return null;
            }
            
            if ( all_img_urls.length < img_urls.length ) {
                // TODO: TweetDeck の引用ツイートから直接ギャラリーを開いたケースだと、TL上に元ツイートが無く、all_img_urls.length = 0 となってしまう
                all_img_urls = img_urls.slice( 0 );
            }
            
            var button_container = button_container_template.cloneNode( true ),
                button = button_container.querySelector( 'input[type="button"]' );
            
            if ( ! OPTIONS.DISPLAY_ORIGINAL_BUTTONS ) {
                button_container.style.display = 'none';
            }
            
            add_event( button, 'click', function ( event ) {
                event.stopPropagation();
                
                var focused_img_url = button.getAttribute( 'data-target-img-url' ),
                    target_img_urls = img_urls.slice( 0 ),
                    target_all_img_urls = all_img_urls.slice( 0 );
                
                button.removeAttribute( 'data-target-img-url' );
                
                if ( OPTIONS.DISPLAY_ALL_IN_ONE_PAGE ^ event.altKey ) {
                    var tweet_link = tweet.querySelector( 'a[rel="url"][href^="https://twitter.com/"],a[rel="url"][href^="/"]' ),
                        tweet_url = tweet.getAttribute( 'data-permalink-path' ) || ( tweet_link && tweet_link.href ),
                        tweet_text = tweet.querySelector( '.tweet-text,.js-tweet-text' ),
                        title = ( tweet_text ) ? ( ( tweet_text.innerText !== undefined ) ? tweet_text.innerText : tweet_text.textContent ) : '';
                    
                    if ( OPTIONS.DISPLAY_OVERLAY ) {
                        show_overlay( target_img_urls, tweet_url, title, focused_img_url, tweet, target_all_img_urls );
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
            } );
            
            
            function insert_button( event ) {
                if ( action_list.querySelector( '.' + button_container_classname ) ) {
                    // TODO: タイミングによっては、ボタンが二重に表示されてしまう不具合対策
                    return;
                }
                button_container.classList.remove( 'removed' );
                
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
            } // end of insert_button()
            
            add_event( button_container, 'reinsert', insert_button );
            
            if ( OPTIONS.OVERRIDE_CLICK_EVENT ) {
                if ( gallery_media && ( ! is_tweetdeck() ) ) {
                    // TODO: ナビが覆いかぶさっている(z-index:1)ため、手前に出して画像クリックイベントの方を優先化しているが、もっとスマートな方法は無いか？
                    gallery_media.style.zIndex = 10;
                    gallery_media.style.pointerEvents = 'none';
                }
                
                to_array( img_objects ).forEach( function ( img ) {
                    if ( is_tweetdeck() && ( ! OPTIONS.OVERRIDE_GALLERY_FOR_TWEETDECK ) && ( ! gallery_media ) ) {
                        return;
                    }
                    
                    if ( img.classList.contains( SCRIPT_NAME + '_touched' ) ) {
                        fire_event( img, 'remove-image-events' );
                    }
                    
                    var open_target_image = ( function () {
                        var lock_event = false;
                        
                        function open_target_image( event ) {
                            if ( lock_event ) {
                                lock_event = false;
                                return;
                            }
                            event.stopPropagation();
                            event.preventDefault();
                            
                            if ( event.altKey ) {
                                // [Alt] / [option] キー押下時には、デフォルト動作を実施
                                lock_event = true;
                                img.click();
                                return;
                            }
                            
                            if ( img.src ) {
                                button.setAttribute( 'data-target-img-url', get_img_url_orig( img.src ) );
                                button.click();
                            }
                            else if ( img.href ) {
                                var img_url = img.getAttribute( 'data-original-url' ) || get_img_url_from_background( img ) || img.href;
                                
                                if ( img_url && /\.(?:jpg|png|gif)/.test( img_url ) ) {
                                    button.setAttribute( 'data-target-img-url', get_img_url_orig( img_url ) );
                                    button.click();
                                }
                            }
                            
                            return false;
                        } // end of open_target_image()
                        
                        return open_target_image;
                    } )(); // end of open_target_image()
                    
                    
                    function remove_image_events( event ) {
                        remove_event( img, 'remove-image-events', remove_image_events );
                        remove_event( img, 'click', open_target_image );
                        img.classList.remove( SCRIPT_NAME + '_touched' );
                    } // end of remove_image_events()
                    
                    
                    if ( ! has_some_classes( img, 'med-origlink' ) ) {
                        add_event( img, 'click', open_target_image );
                        add_event( img, 'remove-image-events', remove_image_events );
                    }
                    
                    if ( img.classList.contains( 'media-image' ) ) {
                        img.style.pointerEvents = 'auto';
                    }
                    
                    img.classList.add( SCRIPT_NAME + '_touched' );
                } );
                
                
            }
            
            function remove_all_image_events( event ) {
                to_array( img_objects ).forEach( function ( img ) {
                    fire_event( img, 'remove-image-events' );
                } )
            } // end of remove_all_image_events()
            
            add_event( button_container, 'remove-all-image-events', remove_all_image_events );
            
            insert_button();
            
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
    
    
    function start_mutation_observer() {
        new MutationObserver( function ( records ) {
            if ( ! is_valid_url() ) { // ※ History API によりページ遷移無しで移動する場合もあるので毎回チェック
                return;
            }
            
            records.forEach( function ( record ) {
                var target = record.target;
                                
                if ( is_tweetdeck() ) {
                    to_array( record.removedNodes ).forEach( function ( removedNode ) {
                        if ( removedNode.nodeType != 1 ) {
                            return;
                        }
                        if ( ! removedNode.classList.contains( 'removed' ) ) {
                            // TweetDeck でユーザーをポップアップ→USERS・MENTIONS等のタイムラインを表示したとき、一度挿入したボタンが削除されることがある→再挿入
                            fire_event( removedNode, 'reinsert' );
                        }
                        
                        if ( removedNode.classList.contains( 'js-media' ) ) {
                            // TweetDeck でメディア(サムネイル)だけが削除→挿入される場合がある
                        }
                    } );
                }
                // ※ addedNodes よりも removedNodes を先に処理しないと、ボタンの存在チェック等で誤動作することがある
                
                to_array( record.addedNodes ).forEach( function ( addedNode ) {
                    if ( addedNode.nodeType != 1 ) {
                        return;
                    }
                    if ( check_tweets( addedNode ) ) {
                        return;
                    }
                    if ( check_help_dialog( addedNode ) ) {
                        return;
                    }
                    
                    if ( is_tweetdeck() ) {
                        if ( addedNode.classList.contains( 'js-media' ) ) {
                            // TweetDeck でメディア(サムネイル)だけが削除→挿入される場合がある
                            var ancestor = search_ancestor( addedNode, [ 'js-stream-tweet', 'tweet', 'js-tweet' ] );
                            
                            if ( ancestor ) {
                                check_tweets( ancestor );
                            }
                            return;
                        }
                    }
                } );
            } );
        } ).observe( d.body, { childList : true, subtree : true } );
        
    } // end of start_mutation_observer()
    
    
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
        
        if ( event.ctrlKey || event.altKey ) {
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
            case 74 : // [j]
                fire_event( image_overlay_container, 'image-next' );
                break;
            case 75 : // [k]
                fire_event( image_overlay_container, 'image-prev' );
                break;
            case 68 : // [d]
                fire_event( image_overlay_container, 'download-image' );
                break;
            case 90 : // [z]
                fire_event( image_overlay_container, 'download-image-zip' );
                break;
            case 83 : // [s]
            case 87 : // [w] (互換性のため残す)
                fire_event( image_overlay_container, 'toggle-image-size' );
                break;
            case 66 : // [b]
                fire_event( image_overlay_container, 'toggle-image-background-color' );
                break;
            case 38 : // [↑]
                fire_event( image_overlay_container, 'scroll-up' );
                break;
            case 40 : // [↓]
                fire_event( image_overlay_container, 'scroll-down' );
                break;
            case 37 : // [←]
                fire_event( image_overlay_container, 'scroll-left' );
                break;
            case 39 : // [→]
                fire_event( image_overlay_container, 'scroll-right' );
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
                ( ( ( active_element.classList.contains( 'tweet-box' ) ) || ( active_element.getAttribute( 'role' ) == 'textbox' ) || ( active_element.getAttribute( 'name' ) == 'tweet' ) ) && ( active_element.getAttribute( 'contenteditable' ) == 'true' ) ) ||
                ( active_element.tagName == 'TEXTAREA' ) ||
                ( ( active_element.tagName == 'INPUT' ) && ( active_element.getAttribute( 'type' ).toUpperCase() == 'TEXT' ) )
            ) {
                return false;
            }
            return true;
        } // end of is_valid()
        
        add_event( d.body, 'keypress', function ( event ) {
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
        } );
        
        add_event( d.body, 'keydown', function ( event ) {
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
        } );
        
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
        
        
        add_event( d, 'contextmenu', function ( event ) {
            check_obstacling_node( event.target );
        } );
    
    } // end of start_mouse_observer()
    
    
    function main() {
        // 新規に挿入されるツイートの監視開始
        start_mutation_observer();
        
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
