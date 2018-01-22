import Twig from 'twig';
import Ajax from './ajax.js';
import OnLoads from './onloads';
import config from '../config/config';

let viewsDir = 'src/tpls/wsbk/';
let jsPath = "./vendor/js/";
let jsFiles = [];
let jsFilesNum = 0;
let properties = ["id", "template", "data", "data_name"];


function loadFile(file) {
    var script = document.createElement('script');
    script.onload = function () {
        //do stuff with the script
        console.log("passoo");
        let DOMContentLoaded_event = document.createEvent("Event")
        DOMContentLoaded_event.initEvent("DOMContentLoaded", true, true)
        window.document.dispatchEvent(DOMContentLoaded_event)
    };
    script.src = file;
    document.head.appendChild(script);
}

function loadScript(location) {
    // Check for existing script element and delete it if it exists
    var js = document.getElementById("sandboxScript");
    if (js !== null) {
        document.body.removeChild(js);
        console.info("---------- Script refreshed ----------");
    }

    // Create new script element and load a script into it
    js = document.createElement("script");
    js.src = location;
    js.id = "sandboxScript";
    js.onload = function () {
        //do stuff with the script
        console.info("---------- Script loaded ----------");
        let DOMContentLoaded_event = document.createEvent("Event")
        DOMContentLoaded_event.initEvent("DOMContentLoaded", true, true)
        window.document.dispatchEvent(DOMContentLoaded_event)
    };
    document.body.appendChild(js);
}

Twig.extend(function (Twig) {
    Twig.exports.extendFunction("t", (source, params) => {
        return source;
    });

    Twig.exports.extendFunction("add_js", (jsFile) => {
        if (jsFiles.indexOf(jsFile) === -1) {
            let scripts_div = document.createElement("DIV");
            scripts_div.setAttribute('data-scripts-src', jsFile);
            scripts_div.id = 'sandboxScript';
            document.body.appendChild(scripts_div);
            jsFiles.push(jsFile);
            loadScript(jsFile);
        }
    });
})

export default class Page {
    constructor() {
        this.routeData = [];
        const menuDiv = document.getElementById("workspace_container");
        this.shadowRoot = menuDiv.attachShadow({ mode: 'open' }).appendChild(menuDiv.cloneNode(true));
        this.loadRoutes()
    }

    loadTemplate(tplObj) {
        console.log(tplObj)
        Ajax.getUrl("http://localhost:3005/" + tplObj.data, {}).subscribe((data) => {
            const loadTpl = function (template) {
                let objData = {};
                const pageSlot = this.shadowRoot.querySelector("#pageSlot");
                objData[tplObj.data_name] = data;

                const removeElements = Array.from(pageSlot.childNodes);
                removeElements.forEach((el) => {
                    el.remove();
                });
                const childs = Array.from(new DOMParser().parseFromString(template.render(objData), "text/html").body.childNodes);
                childs.forEach((child) => {
                    pageSlot.appendChild(child);
                });
            }
            let template = Twig.twig({
                id: tplObj.id,
                namespaces: {
                    'views_dir': './src/tpls'
                },
                href: tplObj.template,
                async: false,
                load: loadTpl.bind(this)
            });
        });
    }

    loadRoutes() {
        Ajax.getUrl("http://localhost:3004/routes", {})
            .subscribe((route) => {
                let routes = [];
                let defaultRoute = {};
                const url = new URL(window.location.href);
                const page = url.searchParams.get("page");
                route.forEach((rs) => {
                    rs.children.forEach((r, index) => {
                        let obj = {}
                        obj.label = r.label;
                        obj.template = r.path + '/' + r.template;
                        obj.id = r.id;
                        obj.data = r.data;
                        obj.data_name = r.data_name;
                        obj.data_name = r.data_name;
                        console.log(page)
                        if (page !== '' && page === obj.id) {
                            obj.default = r.default;
                            defaultRoute = obj;
                        }else if (page === ''){
                            if (r.default) {
                                obj.default = r.default;
                                defaultRoute = obj;
                            } else if (index===0){
                                console.log(index)
                                obj.default = r.default;
                                defaultRoute = obj;
                            }
                        }
                        routes.push(obj);
                    });
                })

                if (defaultRoute) {
                    console.log(defaultRoute)
                    this.loadTemplate(defaultRoute);
                }

                Twig.cache();

                const load = function (template) {
                    const parsedTemplate = new DOMParser().parseFromString(template.render({ "routes": routes }), "text/html").body.firstChild;
                    const slot = this.shadowRoot.querySelector("#menuSlot");
                    slot.addEventListener('slotchange', e => {
                        const links = Array.from(e.target.querySelectorAll("ul li a"));
                        links.forEach((link) => {
                            const clickRef = function (e) {
                                let tplObj = {}
                                Array.from(e.target.attributes).forEach((attr) => {
                                    if (attr.name.indexOf("data-route") != -1) {
                                        tplObj[attr.name.replace("data-route-", "")] = e.target.getAttribute(attr.name);
                                    }
                                });
                                // this.loadTemplate(tplObj);
                                console.log(window.location.origin + '?page="' + tplObj.id + '"')
                                document.location.href = window.location.origin + '?page=' + tplObj.id;
                            }
                            link.addEventListener("click", clickRef.bind(this))
                        });
                    });
                    slot.appendChild(parsedTemplate);
                    const links = Array.from(slot.querySelectorAll("ul li a"));
                    properties.forEach((prop) => {
                        links.forEach((link, index) => {
                            link.setAttribute("data-route-" + prop, routes[index][prop]);
                        });
                    });
                }

                let template = Twig.twig({
                    id: 'menu',
                    namespaces: {
                        'views_dir': './dev/src/tpls'
                    },
                    href: './dev/src/tpls/route_menu.html',
                    async: false,
                    load: load.bind(this)
                });
            })
    }

}

const handler = function () {
    window.base_url = './';
    window.lang = 'es';
    new Page();
    document.removeEventListener('DOMContentLoaded', handler);
}

document.addEventListener('DOMContentLoaded', handler);