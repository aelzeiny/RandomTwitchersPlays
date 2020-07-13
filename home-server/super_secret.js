/**
 Bind secret to my PC's window. Note, I've changed this to be a real base64 encoded key.
 This secret is just for demonstration purposes.
 DO NOT DEPLOY THIS KEY TO PRODUCTION!!!
 */
window.superSecret = 'imbatman';

/**
 * I can feel you judging me. Stop that. Nobody else does Base64 Encryption client side. OKAY!
 * But I do. Because Mozilla Firefox is my streaming server.
 */
window.encodeBase64 = (value, padding) => {
    const encoded = window.btoa(window.unescape(window.encodeURIComponent(value)));
    if (!padding)
        return encoded.replace(/=+$/, '');
    return encoded;
};