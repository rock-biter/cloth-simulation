// import * as Worker from './workers/worker.js'

export default class QueryableWorker {

    self
    worker
    listeners = {}

    constructor(url, defaultListener, onError) {

        this.self = this
        this.worker = new Worker(url,{ type: "module" })
        // this.worker = new Worker()

        this.defaultListener = defaultListener || function() {}

        onError ? this.worker.onError = onError : this.worker.onError = function() {}

        this.worker.onmessage = this.onMessage

    }

    postMessage(message) {
        this.worker.postMessage(message);
    }

    terminate() {
        this.worker.terminate()
    }

    addListener(name, listener) {
        this.listeners[name] = listener
    }

    removeListener(name) {
        delete this.listeners[name]
    }

    sendQuery(...args) {
        if(args.length < 1) {
            throw new TypeError('QueryableWorker.sendQuery takes at least one argument');
            return;
        }

        // console.log('send query')

        this.worker.postMessage({
            'method' : args[0],
            'params' : Array.prototype.slice.call(args,2)
        },args[1])
    }

    onMessage = (event) => {
        if(
            event.data instanceof Object &&
            event.data.hasOwnProperty('method') &&
            event.data.hasOwnProperty('params')
        ) {
            // console.log(event.data.method)
            this.listeners[event.data.method].apply(this,event.data.params)
        } else {
            this.defaultListener(event.data)
        }
    }
    
}