var request = require('request');

const sendMessage = (params) => {
    return new Promise((resolve, reject) => {
        const authentication_key = new Buffer.from(`${process.env.CONVERSATION_USERNAME}:${process.env.CONVERSATION_PASSWORD}`).toString('base64');
        const options = {
            url: `https://gateway.watsonplatform.net/assistant/api/v1/workspaces/${process.env.WORKSPACE_ID}/message?version=2017-05-26`,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authentication_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        }
        request(options, (error, response, body) => {
            // console.log(JSON.stringify(body,null,2))
            if (!error && response.statusCode == 200) {
                resolve(JSON.parse(body))
            } else {
                reject({ error: true, err: body })
            }
        })
    })
}


module.exports = {
    sendMessage
}