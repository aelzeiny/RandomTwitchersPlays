import axios from 'axios';


axios.defaults.withCredentials = true;

window.axios = axios;

const USERNAME_KEY = "_username";

const axiosWithCookies = axios.create({
    withCredentials: true
});


export async function authorize(code) {
    const retval = await axiosWithCookies.get(`/api/login?code=${code}`);
    window.localStorage.setItem(USERNAME_KEY, retval.data.payload.username);
    return retval;
}

export function getUsername() {
    return window.localStorage.getItem(USERNAME_KEY);
}


export async function joinQueue() {
    return await axiosWithCookies.put('/api/user');
}


export async function leaveQueue() {
    return await axiosWithCookies.delete('/api/user');
}

export async function present(token) {
    return await axiosWithCookies.post('/api/present', {token});
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

export function getTrafficURL() {
    return `${wsProtocol()}://${window.location.host}/traffic`;
}

export function openPresenterConnection(jwt) {
    return new WebSocket(getTrafficURL());
}


export function redirectToOauth(promiseErr) {
    const { response } = promiseErr;
    const { redirect } = response.data.detail;
    if (response && response.status === 401 && redirect) {
        window.location.replace(redirect);
    }
}
