import { Color } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { database } from './database';
import { wiv } from './wiv'

const db = database.createOrOpenDatabase();

let properties;
const propertiesContainer = document.getElementById('properties-container');
const guideContainer = document.getElementById('guide-container')

const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({container, backgroundColor: new Color(0xffffff)});
viewer.context.getScene().background = new Color (localStorage.getItem('bgColor')) || null
wiv.viewerSetup(viewer)

let bgColor
const cj = colorjoe.rgb(document.querySelector('.colorjoe'));
cj.show();
cj.on("change", color => {
    bgColor = color.css();
    viewer.context.getScene().background = new Color (bgColor);
});
cj.on("done", color => {
    bgColor = color.css();
    viewer.context.getScene().background = new Color (bgColor);
    localStorage.setItem('bgColor', bgColor)
});

// Get all buttons
const sampleButton = document.getElementById('sample-button');
const saveButton = document.getElementById('save-button');
const removeButton = document.getElementById('remove-button');
const dimButton = document.getElementById('dim-button');
const mapButton = document.getElementById('map-button');
const paletteButton = document.getElementById('palette-button');
const guideButton = document.getElementById('guide-button')

guideButton.onclick = () => {
    if (guideContainer.classList.contains('hidden')) {
        guideButton.classList.replace('bg-blue-500', 'bg-white')
        guideButton.classList.replace('text-white', 'text-blue-500')
        guideContainer.classList.remove('hidden')
    } else {
        guideButton.classList.replace('bg-white', 'bg-blue-500')
        guideButton.classList.replace('text-blue-500', 'text-white')
        guideContainer.classList.add('hidden')
    }
}

// Set up buttons logic
removeButton.onclick = () => {
    wiv.releaseMemory(viewer);
    database.removeDatabase(db);
}

let dimension = false;

dimButton.onclick = () => {
    viewer.IFC.selector.unPrepickIfcItems();
    viewer.context.renderer.postProduction.active = dimension;
    viewer.dimensions.active = !dimension;
    viewer.dimensions.previewActive = !dimension;
    if (dimension) {
        dimButton.classList.replace('bg-white', 'bg-blue-500');
        dimButton.classList.replace('text-blue-500', 'text-white');
    } else {
        viewer.dimensions.deleteAll();
        dimButton.classList.replace('bg-blue-500', 'bg-white');
        dimButton.classList.replace('text-white', 'text-blue-500');
    }
    dimension = !dimension;
}

let palette = false;
const paletteContainer = document.getElementById('palette-container');

paletteButton.onclick = () => {
    if (palette) {
        paletteButton.classList.replace('bg-white', 'bg-blue-500');
        paletteButton.classList.replace('text-blue-500', 'text-white');
        paletteContainer.classList.add('hidden');
    } else {
        paletteButton.classList.replace('bg-blue-500', 'bg-white');
        paletteButton.classList.replace('text-white', 'text-blue-500');
        paletteContainer.classList.remove('hidden');
    }
    palette = !palette;
}

// We use the button to display the GUI and the input to load the file
// Because the input is not customizable
const input = document.getElementById('file-input');
saveButton.onclick = () => input.click();
input.onchange = async (event) => {
    properties = await wiv.preprocessAndSaveIfc(viewer, db, event)
}

sampleButton.onclick = async () => properties = await wiv.loadSampleIfc(viewer, db)

// Find out if there is any data stored; if not, prevent button click
const updateButtons = async () => {
    const previousData = localStorage.getItem('modelsNames');
    if (!previousData) {
        removeButton.setAttribute("disabled", "");
        dimButton.setAttribute("disabled", "");
        mapButton.setAttribute("disabled", "");
        sampleButton.removeAttribute("disabled");
        saveButton.removeAttribute("disabled");
    } else {
        properties = await database.loadSavedIfc(viewer, db);
        removeButton.removeAttribute("disabled");
        dimButton.removeAttribute("disabled");
        mapButton.removeAttribute("disabled");
        sampleButton.setAttribute("disabled", "");
        saveButton.setAttribute("disabled", "");
    }
}

updateButtons();

window.onmousemove = () => {
	if (!dimension) viewer.IFC.selector.prePickIfcItem();
}

window.onclick = async () => {
    propertiesContainer.textContent = ''
	if (!dimension) {
        const result = await viewer.IFC.selector.pickIfcItem();
        if (!result) {
            viewer.IFC.selector.unpickIfcItems();
            !propertiesContainer.classList.contains('hidden') && propertiesContainer.classList.add('hidden');
            return;
        }
        const { modelID, id } = result;
        const pickedProperties = properties[result.id]
        Object.keys(pickedProperties).forEach(propertyName => {
            const div = document.createElement('div');
            const propertyValue = pickedProperties[propertyName];
            div.textContent = `${propertyName}: ${propertyValue}`;
            div.classList.add('break-words');
            propertiesContainer.appendChild(div);
        })
        propertiesContainer.classList.remove('hidden');
    }
};

window.ondblclick = () => {
    viewer.dimensions.create();
}

window.onkeydown = (event) => {
    if (event.code === 'Delete') {
        viewer.dimensions.delete();
    }
    if (event.code === 'Escape') {
        viewer.dimensions.cancelDrawing();
    }
    if (event.code === 'KeyP') {
        viewer.clipper.createPlane();
      }
    if (event.code === 'KeyO') {
        viewer.clipper.deletePlane();
    }
}
