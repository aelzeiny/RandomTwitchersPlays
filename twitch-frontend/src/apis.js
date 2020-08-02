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


export async function openQueueConnection (token) {
    return new WebSocket(`wss://nq8v1ckz81.execute-api.us-east-1.amazonaws.com/dev?token=${token}`);
}
