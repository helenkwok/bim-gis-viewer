import { Matrix4, Vector3,
    PerspectiveCamera,
    DirectionalLight,
    AmbientLight,
    Scene, WebGLRenderer
} from "three";
import { gltf } from "./gltf.js"
import { database } from './database';

let lng
let lat
let coordinates

const db = database.createOrOpenDatabase();

const fetchCoordinates = () => {
    if (localStorage.getItem('coordinates')) {
        coordinatesData = JSON.parse(localStorage.getItem('coordinates'))
        lng = coordinatesData[0]
        lat = coordinatesData[1]
        coordinates = [lng, lat]
    } else {
        lng = -0.14334675
        lat = 51.50567525
        coordinates = [lng, lat]
    }
}

fetchCoordinates();

const coordButton = document.getElementById('coord')
coordButton.addEventListener('click', () => {
    if (localStorage.getItem('coordinates')) {
        coordinatesData = JSON.parse(localStorage.getItem('coordinates'))
        if (coordinates[0] === coordinatesData[0] && coordinates[1] === coordinatesData[1]) {
            localStorage.removeItem('coordinates')
        }
    }
    location.reload();
});

const randomButton = document.getElementById('random')
randomButton.addEventListener('click', () => {
    lng = Math.random() * 360 - 180
    lat = Math.random() * 180 - 90
    coordinates = [lng, lat]
    localStorage.setItem('coordinates', JSON.stringify([coordinates[0], coordinates[1]]))
    location.reload();
});

mapboxgl.accessToken = process.env.MAPBOX_API_KEY;
const map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/mapbox/light-v10',
projection: 'globe', // Display the map as a globe
zoom: 1.5,
center: coordinates,
/*
zoom: 20.5,
center: [13.4453, 52.4910],
pitch: 75,
bearing: -80,
*/
antialias: true
});

const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl
})
// Add the control to the map.
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
//map.addControl(geocoder);
geocoder.on('result', function(e) {
    localStorage.setItem('coordinates', JSON.stringify([e.result.center[0], e.result.center[1]]))
})

const nav = new mapboxgl.NavigationControl({
    visualizePitch: true
    });
map.addControl(nav, 'bottom-left');

// Create a default Marker and add it to the map.
const marker1 = new mapboxgl.Marker()
.setLngLat(coordinates)
.setPopup(
    new mapboxgl.Popup({ offset: 25 }) // add popups
        .setHTML(
        `<h3>current location:</h3><h5>[${lng}, ${lat}]</h5>`
    )
)
.addTo(map);

// Create customLayer for IFC model
const renderer = new WebGLRenderer({
    canvas: map.getCanvas(),
    antialias: true,
});
renderer.autoClear = false;
const scene = new Scene();
const camera = new PerspectiveCamera();

const modelOrigin = [marker1._lngLat.lng, marker1._lngLat.lat];
const modelAltitude = 0;
const modelRotate = [Math.PI / 2, .72, 0];

const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);

const modelTransform = {
translateX: modelAsMercatorCoordinate.x,
translateY: modelAsMercatorCoordinate.y,
translateZ: modelAsMercatorCoordinate.z,
rotateX: modelRotate[0],
rotateY: modelRotate[1],
rotateZ: modelRotate[2],
scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};

const customLayer = {

    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',

    onAdd: function () {
        gltf.loadSavedModel(scene, db);
        const directionalLight = new DirectionalLight(0x404040);
        const directionalLight2 = new DirectionalLight(0x404040);
        const ambientLight = new AmbientLight( 0x404040, 3 );

        directionalLight.position.set(0, -70, 100).normalize();
        directionalLight2.position.set(0, 70, 100).normalize();

        scene.add(directionalLight, directionalLight2, ambientLight);
    },

    render: function (gl, matrix) {
        const rotationX = new Matrix4().makeRotationAxis(
        new Vector3(1, 0, 0), modelTransform.rotateX);
        const rotationY = new Matrix4().makeRotationAxis(
        new Vector3(0, 1, 0), modelTransform.rotateY);
        const rotationZ = new Matrix4().makeRotationAxis(
        new Vector3(0, 0, 1), modelTransform.rotateZ);

        const m = new Matrix4().fromArray(matrix);
        const l = new Matrix4()
        .makeTranslation(
        modelTransform.translateX,
        modelTransform.translateY,
        modelTransform.translateZ
        )
        .scale(
        new Vector3(
        modelTransform.scale,
        -modelTransform.scale,
        modelTransform.scale)
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

        camera.projectionMatrix = m.multiply(l);
        renderer.resetState();
        renderer.render(scene, camera);
        map.triggerRepaint();
      }
};

map.on('style.load', () => {
    map.addLayer(customLayer, 'waterway-label');
})
map.on('load', () => {
// Insert the layer beneath any symbol layer.
    const layers = map.getStyle().layers;
    const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
    ).id;
    // The 'building' layer in the Mapbox Streets
    // vector tileset contains building height data
    // from OpenStreetMap.
    map.addLayer(
        {
        'id': 'add-3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',

            // Use an 'interpolate' expression to
            // add a smooth transition effect to
            // the buildings as the user zooms in.
            'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
            ],
            'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
        }
        },
        labelLayerId
    );

    map.setFog({'range': [0.8, 8]});
})

let isAtStart = true;
const start = {
    center: [30, 50],
    zoom: 1,
    pitch: 0,
    bearing: 0
};
const end = {
    // center: [74.5, 40],
    // zoom: 2
    center: coordinates,
    zoom: 20.5,
    pitch: 75,
    bearing: -80,
};

const flyButton = document.getElementById('fly')
const flyText = document.getElementById('flyText')

flyButton.addEventListener('click', () => {
// depending on whether we're currently at point a or b,
// aim for point a or b
    const target = isAtStart ? end : start;
    isAtStart = !isAtStart;
    flyText.textContent = isAtStart ? 'Fly to model' : 'Back to space';
    map.flyTo({
        ...target, // Fly to the selected target
        duration: 12000, // Animate over 12 seconds
        essential: true // This animation is considered essential with
//respect to prefers-reduced-motion
    });
});

let markerVisibility = true;
const markerVisButton = document.getElementById('markerVis')
const markerVisText = document.getElementById('markerVisText')

markerVisButton.addEventListener('click', () => {
    if (markerVisibility) {
        markerVisText.textContent = 'Show model marker'
        markerVisButton.classList.remove('bg-white', 'text-blue-500')
        markerVisButton.classList.add('bg-blue-500', 'text-white')
        marker1.remove()
    } else {
        markerVisText.textContent = 'Hide model marker'
        markerVisButton.classList.remove('bg-blue-500', 'text-white')
        markerVisButton.classList.add('bg-white', 'text-blue-500')
        marker1.addTo(map)
    }
    markerVisibility = !markerVisibility

});
