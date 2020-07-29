import axios from 'axios';
const https = require('https');


const apiGateway = 'https://fhfgpzs40f.execute-api.us-east-1.amazonaws.com/dev';
axios.defaults.withCredentials = true;


const axiosWithCookies = axios.create({
    withCredentials: true,
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    })
});


export async function authorize(code) {
    return await axiosWithCookies.get(`${apiGateway}/authorize/${code}`);
}


export async function joinQueue() {
    return await axiosWithCookies.put(`${apiGateway}/queue`);
}


export async function leaveQueue() {
    return await axiosWithCookies.delete(`${apiGateway}/queue`);
}
