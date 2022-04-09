// Load the inferencing WebAssembly module
const Module = require('./edge-impulse-standalone');
const fs = require('fs');
const port = require('serialport');

const serial = new port.SerialPort({
    path: 'COM9',
    baudRate:115200,
}).setEncoding('utf8')
let timestamp = new Date().getTime();
let data_Recv = []; 
const readline = new port.ReadlineParser();
serial.pipe(readline);
readline.on('data',function(line){
    const temp = new Date().getTime();
    JSON.stringify(line).split(',').forEach(i=>{
        data_Recv.push((i.replace(/[^0-9.+-]/g, '')))
    });
    if(temp - timestamp > 2000)
    {
        let result = classifier.classify(data_Recv.toString().trim().split(',').map(n => Number(n)));
        console.log(result);
        data_Recv = [];
        timestamp = temp;
    }
});
// Classifier module
let classifierInitialized = false;
Module.onRuntimeInitialized = function() {
    classifierInitialized = true;
};

class EdgeImpulseClassifier {
    _initialized = false;

    init() {
        if (classifierInitialized === true) return Promise.resolve();

        return new Promise((resolve) => {
            Module.onRuntimeInitialized = () => {
                resolve();
                classifierInitialized = true;
            };
        });
    }

    getProjectInfo() {
        if (!classifierInitialized) throw new Error('Module is not initialized');
        return Module.get_project();
    }

    classify(rawData, debug = false) {
        if (!classifierInitialized) throw new Error('Module is not initialized');

        let props = Module.get_properties();

        const obj = this._arrayToHeap(rawData);
        let ret = Module.run_classifier(obj.buffer.byteOffset, rawData.length, debug);
        Module._free(obj.ptr);

        if (ret.result !== 0) {
            throw new Error('Classification failed (err code: ' + ret.result + ')');
        }


        let jsResult = {
            anomaly: ret.anomaly,
            results: []
        };

        for (let cx = 0; cx < ret.size(); cx++) {
            let c = ret.get(cx);
            if (props.model_type === 'object_detection' || props.model_type === 'constrained_object_detection') {
                jsResult.results.push({ label: c.label, value: c.value, x: c.x, y: c.y, width: c.width, height: c.height });
            }
            else {
                jsResult.results.push({ label: c.label, value: c.value });
            }
            c.delete();
        }

        ret.delete();

        return jsResult;
    }

    getProperties() {
        return Module.get_properties();
    }

    _arrayToHeap(data) {
        let typedArray = new Float32Array(data);
        let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        let ptr = Module._malloc(numBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
        heapBytes.set(new Uint8Array(typedArray.buffer));
        return { ptr: ptr, buffer: heapBytes };
    }
}

if (!process.argv[2]) {
    console.error('Requires one parameter (a comma-separated list of raw features, or a file pointing at raw features)');
}

let features = process.argv[2];
if (fs.existsSync(features)) {
    features = fs.readFileSync(features, 'utf-8');
}

// Initialize the classifier, and invoke with the argument passed in
let classifier = new EdgeImpulseClassifier();
classifier.init().then(async () => {
    let project = classifier.getProjectInfo();
    console.log('Running inference for', project.owner + ' / ' + project.name + ' (version ' + project.deploy_version + ')');

    let result = classifier.classify(features.trim().split(',').map(n => Number(n)));

    console.log(result);
}).catch(err => {
    console.error('Failed to initialize classifier', err);
});
