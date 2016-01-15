( function ( w, d ) {

'use strict';

// https://developer.chrome.com/extensions/runtime#event-onMessage
chrome.runtime.onMessage.addListener( function ( message, sender, sendResponse ) {
    var type = message.type,
        response = null;
    
    switch ( type ) {
        case 'GET_OPTIONS':
            var names = message.names;
            response = {};
            
            if ( typeof name_list == 'string' ) {
                names = [ names ];
            }
            
            Array.apply( null, names ).forEach( function( name ) {
                name = String( name );
console.log( name, localStorage[ name ] );
                response[ name ] = localStorage[ name ];
            } );
            
            break;
        default:
            break;
    }
    
    sendResponse( response );
} );

} )( window, document );

// ■ end of file
