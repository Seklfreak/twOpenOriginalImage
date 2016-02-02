( function ( w, d ) {

'use strict';

var DEBUG = false,

    CONTEXT_MENU_INITIALIZED = false,
    CONTEXT_MENU_IS_VISIBLE = true,
    CONTEXT_MENU_IS_SUSPENDED = false,
    
    DOWNLOAD_MENU_ID = 'download_image';


function log_debug() {
    if ( ! DEBUG ) {
        return;
    }
    console.log.apply( console, arguments );
} // end of log_debug()


function get_bool( value ) {
    if ( value === undefined ) {
        return null;
    }
    if ( ( value === '0' ) || ( value === 0 ) || ( value === false ) || ( value === 'false' ) ) {
        return false;
    }
    if ( ( value === '1' ) || ( value === 1 ) || ( value === true ) || ( value === 'true' ) ) {
        return true;
    }
    return null;
} // end of get_bool()


function update_context_menu_flags() {
    var is_valid = ( get_bool( localStorage[ 'DOWNLOAD_HELPER_SCRIPT_IS_VALID' ] ) !== false ) ? true : false,
        operation = ( get_bool( localStorage[ 'OPERATION' ] ) !== false ) ? true : false;
    
    CONTEXT_MENU_IS_VISIBLE = is_valid;
    CONTEXT_MENU_IS_SUSPENDED = ! operation;
    
    log_debug( 'CONTEXT_MENU_IS_VISIBLE:', CONTEXT_MENU_IS_VISIBLE, 'CONTEXT_MENU_IS_SUSPENDED:', CONTEXT_MENU_IS_SUSPENDED );
} // end of update_context_menu_flags()



function download_image( img_url ) {
    var img_url_orig = img_url.replace( /:\w*$/, '' ) + ':orig',
        filename = img_url_orig.replace( /^.+\/([^\/.]+)\.(\w+):(\w+)$/, '$1-$3.$2' ),
        download_link = d.createElement( 'a' );
    
    download_link.href = img_url_orig;
    download_link.download = filename;
    //d.documentElement.appendChild( download_link );
    download_link.click();
    
    log_debug( '*** download_image():', img_url, img_url_orig, filename );
} // end of download_image()


function initialize( eventname ) {
    log_debug( '*** initialize():', eventname );
    
    var title = chrome.i18n.getMessage( 'DOWNLOAD_ORIGINAL_IMAGE' );
    
    update_context_menu_flags();
    
    if ( ! CONTEXT_MENU_IS_VISIBLE ) {
        if ( CONTEXT_MENU_INITIALIZED ) {
            chrome.contextMenus.remove( DOWNLOAD_MENU_ID );
            CONTEXT_MENU_INITIALIZED = false;
        }
        
        log_debug( '*** initialize(): remove context menu' );
        return;
    }
    
    if ( CONTEXT_MENU_IS_SUSPENDED ) {
        title += '[' + chrome.i18n.getMessage( 'UNDER_SUSPENSION' ) +']';
    }
    
    if ( CONTEXT_MENU_INITIALIZED ) {
        chrome.contextMenus.update( DOWNLOAD_MENU_ID, {
            title : title
        } );
        
        log_debug( '*** initialize(): rename title to ', title );
        return;
    }
    
    CONTEXT_MENU_INITIALIZED = true;
    
    log_debug( '*** initialize(): completed' );
    
    // TODO:
    //   ときどき、ブラウザを再起動後等の状態で
    //   Unchecked runtime.lastError while running contextMenus.create: Cannot create item with duplicate id download_image
    //   が発生。
    //   ※ chrome.contextMenus.removeAll() 後であっても発生してしまう。
    try {
        chrome.contextMenus.create( {
            type : 'normal'
        ,   id : DOWNLOAD_MENU_ID
        ,   title : title
        ,   contexts : [ 'image' ]
        ,   targetUrlPatterns : [ '*://pbs.twimg.com/media/*' ]
        } );
    }
    catch( error ) {
        // TODO: try～catch にも引っかからない模様
        // 参考: [Issue 551912 - chromium - Try/Catch not working when trying to create existing menu](https://code.google.com/p/chromium/issues/detail?id=551912)
        console.error( error );
    }
    
} // end of initialize()


function on_message( message, sender, sendResponse ) {
    log_debug( '*** on_message():', message, sender );
    
    var type = message.type,
        response = null;
    
    switch ( type ) {
        case 'GET_OPTIONS':
            var names = message.names,
                namespace = message.namespace;
            
            response = {};
            
            if ( typeof name_list == 'string' ) {
                names = [ names ];
            }
            
            Array.apply( null, names ).forEach( function( name ) {
                name = String( name );
                response[ name ] = localStorage[ ( ( namespace ) ? ( String( namespace ) + '_' ) : '' ) + name ];
            } );
            break;
        
        case 'RESET_CONTEXT_MENU':
            initialize( 'onMessage' );
            break;
        
        default:
            break;
    }
    
    sendResponse( response );
}  // end of on_message()


function on_click( info, tab ) {
    log_debug( '*** on_click():', info, tab );
    
    update_context_menu_flags();
    
    if ( ( ! CONTEXT_MENU_IS_VISIBLE ) || CONTEXT_MENU_IS_SUSPENDED ) {
        return;
    }
    
    switch ( info.menuItemId ) {
        case DOWNLOAD_MENU_ID :
            download_image( info.srcUrl );
            break;
        default :
            break;
    }
} // end of on_click()


function on_startup() {
    log_debug( '*** on_startup()' );
    
    initialize( 'onStartup' );
} // end of on_startup()


function on_installed( details ) {
    log_debug( '*** on_installed():', details );
    
    initialize( 'onInstalled' );
} // end of on_installed()


// ■ 各種イベント設定
// [chrome.runtime - Google Chrome](https://developer.chrome.com/extensions/runtime)
// [chrome.contextMenus - Google Chrome](https://developer.chrome.com/extensions/contextMenus)

// メッセージ受信
chrome.runtime.onMessage.addListener( on_message );

// クリックイベント(コンテキストメニュー)
chrome.contextMenus.onClicked.addListener( on_click );

// Startup イベント
chrome.runtime.onStartup.addListener( on_startup );

// Installed イベント
chrome.runtime.onInstalled.addListener( on_installed );

} )( window, document );

// ■ end of file
