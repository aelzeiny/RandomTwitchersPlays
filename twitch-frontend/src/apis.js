import axios from 'axios';


export const getUserInfo = async (uuid) => {
    const response = await axios.get('/api/' + uuid);
    console.log(response);
    if (response.status !== 200)
        throw new URIError('Invalid Response: ' + response.status);
    return response.data;
};