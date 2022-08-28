import {
  IFCWALL,
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCCOVERING,
  IFCCOLUMN,
  IFCWINDOW,
  IFCMEMBER,
  IFCPLATE,
  IFCCURTAINWALL,
  IFCFLOWFITTING,
  IFCFLOWSEGMENT,
  IFCFLOWTERMINAL,
  IFCBUILDINGELEMENTPROXY,
  IFCDOOR,
  IFCFURNISHINGELEMENT,
  IFCSTAIR,
  IFCSTAIRFLIGHT,
  IFCRAILING
} from 'web-ifc';

const setUpMultiThreading = async (viewer) => {
  await viewer.IFC.loader.ifcManager.useWebWorkers(true, '../static/IFCWorker.js')
  await viewer.IFC.setWasmPath("../static/");
}

const releaseMemory = async (viewer) => {
  // This releases all IFCLoader memory
  await viewer.IFC.loader.ifcManager.dispose();
}

const setupProgressNotification = (loaded, total, string) => {
  const container = document.getElementById('progress-container');
  const label = document.getElementById('progress-label');
  label.textContent = `Loading ${string}:`;
  container.classList.remove('hidden')
  const percent = loaded / total * 100;
  const result = Math.trunc(percent);
  const text = document.getElementById('progress-text');
  text.textContent = `${result.toString()} %`;
}

const viewerSetup = (viewer) => {
  setUpMultiThreading(viewer);
  viewer.grid.setGrid();
  viewer.axes.setAxes();
}

// Saving the model
const preprocessAndSaveIfc = async (viewer, db, event) => {
  const file = event.target.files[0];
  const url = URL.createObjectURL(file);

  ifcToGLFT(viewer, db, url)
}

const loadSampleIfc = async (viewer, db) => {
  const url = '../static/01.ifc'
  ifcToGLFT(viewer, db, url)
}

const ifcToGLFT = async (viewer, db, url) => {
  // Export to glTF and JSON
  const result = await viewer.GLTF.exportIfcFileAsGltf({
    ifcFileUrl: url,
    spliteByFloor: true,
    categories: {
        walls: [IFCWALL, IFCWALLSTANDARDCASE],
        slabs: [IFCSLAB],
        ceilings: [IFCCOVERING],
        columns: [IFCCOLUMN],
        windows: [IFCWINDOW],
        curtainwalls: [IFCMEMBER, IFCPLATE, IFCCURTAINWALL],
        doors: [IFCDOOR],
        furniture: [IFCFURNISHINGELEMENT],
        pipes: [IFCFLOWFITTING, IFCFLOWSEGMENT, IFCFLOWTERMINAL],
        stairs: [IFCSTAIR, IFCSTAIRFLIGHT, IFCRAILING],
        undefined: [IFCBUILDINGELEMENTPROXY],
    },
    getProperties: true,
    onProgress: setupProgressNotification
});

// Store the result in the browser memory

const models = [];
const properties = [];

for (const categoryName in result.gltf) {
    const category = result.gltf[categoryName];
    for (const levelName in category) {
        const file = category[levelName].file;
        if (file) {
            // Serialize data for saving it
            const data = await file.arrayBuffer();
            models.push({
                name: result.id + categoryName + levelName,
                id: result.id,
                category: categoryName,
                level: levelName,
                file: data
            })
        }
    }
}

for (const propertiesJson of result.json) {
  const propertiesFile = await propertiesJson.arrayBuffer()

  properties.push({
    name: propertiesJson.name,
    id: result.id,
    file: propertiesFile
  })
}

// Now, store all the models in the database
await db.bimModels.bulkPut(models);
await db.properties.bulkPut(properties);

// And store all the names of the models
const serializedModelNames = JSON.stringify(models.map(model => model.name));
const serializedPropertyNames = JSON.stringify(properties.map(property => property.name));
localStorage.setItem("modelsNames", serializedModelNames);
localStorage.setItem("propertiesNames", serializedPropertyNames);
location.reload();
}

export const wiv = {
  viewerSetup,
  releaseMemory,
  preprocessAndSaveIfc,
  loadSampleIfc
}