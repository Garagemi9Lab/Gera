//utilities
function createXHR() {
    if (typeof XMLHttpRequest != 'undefined') {
        return new XMLHttpRequest();
    } else {
        try {
            return new ActiveXObject('Msxml2.XMLHTTP');
        } catch (e) {
            try {
                return new ActiveXObject('Microsoft.XMLHTTP');
            } catch (e) {}
        }
    }
    return null;
}


const xhrGet = (url, callback, errback) => {
    var xhr = new createXHR();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                callback(toJson(xhr.responseText));
            } else {
                errback(toJson('service not available'));
            }
        }
    };

    xhr.timeout = 100000;
    xhr.ontimeout = errback;
    xhr.send();
}



const xhrPost = (url, data, callback, errback) => {
    var xhr = new createXHR();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                callback(toJson(xhr.responseText));
            } else {
                errback(toJson(xhr.responseText));
            }
        }
    };
    xhr.timeout = 100000;
    xhr.send(JSON.stringify(data));
}

const toJson = (responseText) => {
    try{
        responseText = JSON.parse(responseText)
    }catch{
        responseText = { msg : responseText }
    }

    return responseText
    
    
    
}