import axios from 'axios';


axios.defaults.withCredentials = true;

window.axios = axios;


const axiosWithCookies = axios.create({
    withCredentials: true
});


export async function authorize(code) {
    return await axiosWithCookies.get(`/api/login/${code}`);
}


export async function joinQueue() {
    return await axiosWithCookies.put('/api/user');
}


export async function leaveQueue() {
    return await axiosWithCookies.delete('/api/user');
}

function wsProtocol() {
    if (window.location.protocol.startsWith('https')) {
        return 'wss';
    }
    return 'ws';
}


export function openQueueConnection() {
    return new WebSocket(`${wsProtocol()}://${window.location.host}/ws`);
}


export function openStreamerConnection(id) {
    return new WebSocket(`${wsProtocol()}://${window.location.host}/traffic`);
}


export function openPresenterConnection(jwt) {
    document.cookie = `token=${jwt}; path=/`;
    return new WebSocket(`${wsProtocol()}://${window.location.host}/traffic`);
}


export function redirectToOauth(promiseErr) {
    const { response } = promiseErr;
    const { redirect } = response.data.detail;
    if (response && response.status === 401 && redirect) {
        window.location.replace(redirect);
    }
}
