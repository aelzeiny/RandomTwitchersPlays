import axios from 'axios';


axios.defaults.withCredentials = true;

window.axios = axios;


const axiosWithCookies = axios.create({
    withCredentials: true
});


export async function authorize(code) {
    return await axiosWithCookies.get(`/lambda/login/${code}`);
}


export async function joinQueue() {
    return await axiosWithCookies.put('/lambda/user');
}


export async function leaveQueue() {
    return await axiosWithCookies.delete('/lambda/user');
}


export function openQueueConnection(token) {
    return new WebSocket(`wss://nq8v1ckz81.execute-api.us-east-1.amazonaws.com/dev?token=${token}`);
}


export function openStreamerConnection(id) {
    return new WebSocket(`wss://${window.location.host}/traffic?id=${id}`);
}

export function openPresenterConnection(jwt) {
    return new WebSocket(`wss://${window.location.host}/traffic?jwt=${jwt}`);
}


export function redirectToOauth(promiseErr) {
    const { response } = promiseErr;
    if (response && response.status === 401 && response.data.clientId) {
        const redirectUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${response.data.clientId}&redirect_uri=${window.location.origin}/authorize&response_type=code&scope=openid&claims={"id_token":{"preferred_username":null, "picture":null},"userinfo":{"picture":null, "preferred_username":null}}`;
        window.location.replace(redirectUrl);
    }
}
