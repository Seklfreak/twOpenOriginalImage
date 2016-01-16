( function ( w, d ) {

'use strict';

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
}  // end of get_bool()


function get_int( value ) {
    if ( isNaN( value ) ) {
        return null;
    }
    return parseInt( value, 10 );
} // end of get_int()


function get_text( value ) {
    if ( value === undefined ) {
        return null;
    }
    return String( value );
} // end of get_text()


function get_init_function( message_type, option_name_to_function_map, namespace ) {
    var option_names = [];
    
    for ( var option_name in option_name_to_function_map ) {
        if ( option_name_to_function_map.hasOwnProperty( option_name ) ) {
            option_names.push( option_name );
        }
    }
    
    function analyze_response( response ) {
        var options = {};
        
        if ( ! response ) {
            response = {};
        }
        
        for ( var option_name in option_name_to_function_map ) {
            if ( ! ( response.hasOwnProperty( option_name ) ) ) {
                options[ option_name ] = null;
                continue;
            }
            options[ option_name ] =  option_name_to_function_map[ option_name ]( response[ option_name ] );
        }
        return options;
    }
    
    function init( callback ) {
        // https://developer.chrome.com/extensions/runtime#method-sendMessage
        chrome.runtime.sendMessage( {
            type : message_type
        ,   names : option_names
        ,   namespace :  ( namespace ) ? namespace : ''
        }, function ( response ) {
            var options = analyze_response( response );
            callback( options );
        } );
    }
    
    return init;
} // end of get_init_function()


if ( w.location.href.match( /^https?:\/\/twitter\.com/ ) ) {
    var twOpenOriginalImage_chrome_init = ( function() {
        var option_name_to_function_map = {
                SHOW_IN_DETAIL_PAGE : get_bool
            ,   SHOW_IN_TIMELINE : get_bool
            ,   DISPLAY_ALL_IN_ONE_PAGE : get_bool
            ,   OPERATION : get_bool
            ,   WAIT_AFTER_OPENPAGE : get_int
            ,   TITLE_PREFIX : get_text
            ,   TWEET_LINK_TEXT : get_text
            ,   BUTTON_TEXT : get_text
            ,   BUTTON_HELP_DISPLAY_ALL_IN_ONE_PAGE : get_text
            ,   BUTTON_HELP_DISPLAY_ONE_PER_PAGE : get_text
            };
        
        return get_init_function( 'GET_OPTIONS', option_name_to_function_map );
    } )(); // end of twOpenOriginalImage_chrome_init()
    
    w.twOpenOriginalImage_chrome_init = twOpenOriginalImage_chrome_init;
    return;
}

if ( w.location.href.match( /^https?:\/\/pbs\.twimg\.com\/media\// ) ) {
    var twImageDownloadHelper_chrome_init = ( function() {
        var option_name_to_function_map_main = {
                OPERATION : get_bool
            },
            option_name_to_function_map_helper = {
                SCRIPT_IS_VALID : get_bool
            ,   BUTTON_TEXT : get_text
            },
            init_main = get_init_function( 'GET_OPTIONS', option_name_to_function_map_main ),
            init_helper = get_init_function( 'GET_OPTIONS', option_name_to_function_map_helper, 'DOWNLOAD_HELPER' );
        
        function twImageDownloadHelper_chrome_init( callback ) {
            init_main( function ( user_options ) {
                if ( ! user_options.OPERATION ) {
                    callback( {
                        SCRIPT_IS_VALID : false
                    } );
                    return;
                }
                init_helper( function ( user_options ) {
                    callback( user_options );
                } );
            } );
        }
        
        return twImageDownloadHelper_chrome_init;
    } )(); // end of twImageDownloadHelper_chrome_init()
    
    w.twImageDownloadHelper_chrome_init = twImageDownloadHelper_chrome_init;
    return;
}

} )( window, document );

// ■ end of file
