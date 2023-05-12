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


export function openQueueConnection(token) {
    console.log('ayy');
    return new WebSocket(`wss://${window.location.host}/ws?token=${token}`);
}


export function openStreamerConnection(id) {
    return new WebSocket(`wss://${window.location.host}/traffic?id=${id}`);
}

export function openPresenterConnection(jwt) {
    return new WebSocket(`wss://${window.location.host}/traffic?jwt=${jwt}`);
}


export function redirectToOauth(promiseErr) {
    const { response } = promiseErr;
    const clientId = response.data.detail.clientId;
    if (response && response.status === 401 && clientId) {
        console.log(clientId, window.location.origin)
        const redirectUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${window.location.origin}/authorize&response_type=code&scope=openid`;
        window.location.replace(redirectUrl);
    }
}
