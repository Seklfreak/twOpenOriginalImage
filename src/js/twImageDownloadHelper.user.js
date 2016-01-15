// ==UserScript==
// @name            twImageDownloadHelper
// @namespace       http://furyu.hatenablog.com/
// @author          furyu
// @version         0.1.0.0
// @include         https://pbs.twimg.com/media/*
// @description     Helper to download images from Twitter
// ==/UserScript==
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

var SCRIPT_NAME = 'twImageDownloadHelper';

if ( ( w !== w.parent ) || ( w[ SCRIPT_NAME + '_touched' ] ) ) {
    return;
}
w[ SCRIPT_NAME + '_touched' ] = true;


// ■ パラメータ
var OPTIONS = {
    SCRIPT_IS_VALID : true // true: 動作有効
}


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
        OPTIONS.BUTTON_TEXT = 'ダウンロード';
        break;
    default:
        OPTIONS.BUTTON_TEXT = 'Download';
        break;
}


function initialize( user_options ) {
    if ( user_options ) {
        for ( var name in user_options ) {
            if ( ! ( user_options.hasOwnProperty( name ) ) || ( user_options[ name ] === null ) ) {
                continue;
            }
            OPTIONS[ name ] = user_options[ name ];
        }
    }
    
    if ( ! OPTIONS.SCRIPT_IS_VALID ) {
        return;
    }
    
    var img_url = w.location.href,
        filename = img_url.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '$1-$3.$2' ),
        link = d.createElement( 'a' ),
        container = d.createElement( 'div' ),
        link_style = link.style;
    
    link.href = img_url;
    link.download = filename;
    
    link_style.display = 'inline-block';
    link_style.fontWeight = 'normal';
    link_style.fontSize = '16px';
    link_style.color = 'gray';
    link_style.background = '#fff';
    link_style.textDecoration = 'none';
    link_style.margin = '2px 4px';
    link_style.padding = '4px 8px';
    link_style.border = 'solid 2px #e1e8ed';
    link_style.borderRadius = '3px';
    
    link.addEventListener( 'mouseover', function( event ) {
        link_style.borderColor = 'red';
    } );
    
    link.addEventListener( 'mouseout', function( event ) {
        link_style.borderColor = '#e1e8ed';
    } );
    
    link.appendChild( d.createTextNode( OPTIONS.BUTTON_TEXT ) );
    container.appendChild( link );
    d.body.insertBefore( container, d.body.firstChild );
} // end of initialize()


if ( typeof w.twImageDownloadHelper_chrome_init == 'function' ) {
    // Google Chorme 拡張機能から実行した場合、ユーザーオプションを読み込む
    w.twImageDownloadHelper_chrome_init( function ( user_options ) {
        initialize( user_options );
    } );
}
else {
    initialize();
}

} )( window, document );

// ■ end of file
