const setSession = (name, value) => {
    if (typeof (Storage) !== "undefined") {
        sessionStorage.setItem(name, JSON.stringify(value));
    }
    else {
        setCookie(name, JSON.stringify(value));
    }
}


const setCookie = (cname, cvalue) => {
    var d = new Date();
    d.setTime(d.getTime() + (1 * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


const getSession = (name) => {
    if (typeof (Storage) !== "undefined") {
        // Code for localStorage/sessionStorage.
        return JSON.parse(sessionStorage.getItem(name));
    }
    else {
        // Sorry! No Web Storage support.. use cookie instead..
        return JSON.parse(getCookie(name));
    }
}

const getStorage = (name) => {
    if (typeof (Storage) !== "undefined") {
        // Code for localStorage/sessionStorage.
        return JSON.parse(localStorage.getItem(name));
    }
    else {
        // Sorry! No Web Storage support.. use cookie instead..
        return JSON.parse(getCookie(name));
    }
}

const sessionCheck = (name) => {

    if (typeof (Storage) !== "undefined") {
        if (sessionStorage.getItem(name)) {
            return true;
        }
        return false;
        // return sessionStorage.user != null && sessionStorage.user != '' && sessionStorage.user !== "undefined";
    }
    else {
        //No storage , use cookie..
        return checkCookie(name);
    }
}

const getCookie = (cname) => {
    name = name + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";

}

const checkCookie = (cname) => {
    var username = getCookie(cname);

    if (username != "" && username != null) {
        return true;
    }
    else {
        return false;
    }
}

const deleteSession = (name) => {
    if (typeof (Storage) !== "undefined") {
        sessionStorage.removeItem(name);
    }
    else {
        deleteCookie(name);
    }
}

const deleteStorage = (name) => {
    if (typeof (Storage) !== "undefined") {
        localStorage.removeItem(name);
    }
    else {
        deleteCookie(name);
    }
}

const deleteCookie = (cname) => {
    document.cookie = cname + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}




const showLoadingInElement = (id) => {
    let loader = '<div class="preloader-wrapper small active">' +
        '<div class="spinner-layer spinner-blue-only">' +
        '<div class="circle-clipper left">' +
        '<div class="circle"></div>' +
        '</div><div class="gap-patch">' +
        '<div class="circle"></div>' +
        '</div><div class="circle-clipper right">' +
        '<div class="circle"></div>' +
        '</div></div></div>';
    $("#" + id).html(loader);
}

const removeLoadingInElement = (id, insideText) => {
    $("#" + id).html(insideText);
}

let timer = null;
const showAlert = (message, type) => {
    if (timer != null)
        clearTimeout(timer);
    $("#alertBox").removeClass("hide");
    let painel_message = $("#alertBox").children()[1];
    painel_message.innerHTML = getMessage(message);
    let colorClass = '';
    switch (type) {
        case "error":
            colorClass = 'red accent-2';
            break;
        case "success":
            colorClass = 'green accent-4';
            break;
    }
    $(painel_message).addClass(colorClass);
    timer = setTimeout(() => {
        $("#alertBox").addClass('hide');
        $(painel_message).removeClass(colorClass);
    }, 4000);

}

const getMessage = (message) => {
    switch (message) {
        case "WRONG_CREDENTIALS":
            return "User not found or incorrect password. check your input.";
            break;
        case "EXPIRED_SESSION":
            return "Expired Session."
            break;
        case undefined:
            return "An error ocurred, try again.";
            break;
        case "INTERNAL_SERVER_ERROR":
            return "An error ocurred, try again.";
            break;
        case "BAD_REQUEST":
            return "An error ocurred, Verify your info and try again.";
            break;
        default:
            return message;
            break;
    }
}


const userInteract = (status) => {
    console.log('User interact method invoked..');
    if (!status) {
        $("#userInteractOverlay").removeClass('hide');
    } else {
        $("#userInteractOverlay").addClass('hide');
    }
}