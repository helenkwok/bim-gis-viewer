import { GLTFLoader } from "../static/GLTFLoader";

async function loadSavedModel(scene, db) {
  const loader = new GLTFLoader();

  // Get the names of the stored models
  const serializedNames = localStorage.getItem("modelsNames");
  const names = JSON.parse(serializedNames);

  // Get all the models from memory and load them
  for (const name of names) {
      const savedModel = await db.bimModels.where("name").equals(name).toArray();

      // Deserialize the data
      const data = savedModel[0].file
      const file = new File([data], 'example');
      const url = URL.createObjectURL(file);
      load(loader, url, scene)
  }
}

const load = async (loader, url, scene) => {
  const loaded = (await loader.loadAsync(url));
  const mesh = loaded.scene;
  scene.add(mesh)
  return mesh;
}

export const gltf = {
  loadSavedModel
}