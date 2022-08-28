import {Dexie} from "dexie";

// If the db exists, it opens; if not, dexie creates it automatically
function createOrOpenDatabase() {
  const db = new Dexie("ModelDatabase");

  // DB with single table "bimModels" with primary key "name" and
  // an index on the property "id"
  db.version(1).stores({
      bimModels: `
      name,
      id,
      category,
      level`,
      properties: `
      name,
      id`
  });

  return db;
}

async function loadSavedIfc(viewer, db) {
  let properties;
  // Get the names of the stored models
  const serializedModelNames = localStorage.getItem("modelsNames");
  const serializedPropertyNames = localStorage.getItem("propertiesNames");

  const modelNames = JSON.parse(serializedModelNames);
  const propertyNames = JSON.parse(serializedPropertyNames);
  // Get all the models from memory and load them
  for (const name of modelNames) {
      const savedModel = await db.bimModels.where("name").equals(name).toArray();

      // Deserialize the data
      const data = savedModel[0].file
      const file = new File([data], 'example');
      const url = URL.createObjectURL(file);
      const model = await viewer.GLTF.loadModel(url);
      viewer.clipper.active = true;
      viewer.context.renderer.postProduction.active = true;
      await viewer.shadowDropper.renderShadow(model.modelID);
  }
    const savedProperties = await db.properties.where('name').equals(propertyNames[0]).toArray()
    const data = savedProperties[0].file
    const file = new File([data], 'savedProperties')
    const url = URL.createObjectURL(file)
    // Load properties
    const rawProperties = await fetch(url);
    properties = await rawProperties.json()
    return properties
}

function removeDatabase(db) {
  localStorage.removeItem("modelsNames");
  localStorage.removeItem("propertiesNames");
  db.delete();
  location.reload();
}


export const database = {
  createOrOpenDatabase,
  loadSavedIfc,
  removeDatabase
}