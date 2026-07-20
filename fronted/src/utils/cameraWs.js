export function createCameraSocket(url,onMessage){const socket=new WebSocket(url);socket.addEventListener('message',event=>onMessage?.(event.data));return socket;}
