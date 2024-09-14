import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

const FullScreenContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const MapContainer = styled.div`
  width: 100%;
  height: 100%;
`;

const expandMenu = keyframes`
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
`;

const CircularMenu = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${expandMenu} 0.3s ease-out;
`;

const MenuButton = styled.button`
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: #3498db;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const PowerButton = styled.button`
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background-color: ${props => props.active ? '#2ecc71' : '#e74c3c'};
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  z-index: 1000;

  &:hover {
    transform: scale(1.1);
  }
`;

const ColorPicker = styled.input`
  position: fixed;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
`;

const InfoWindow = styled.div`
  position: absolute;
  background-color: white;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 1000;
`;

const MapComponent = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [activeShape, setActiveShape] = useState(null);
  const [menuActive, setMenuActive] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#FF0000');
  const [infoWindow, setInfoWindow] = useState(null);

  const addLog = useCallback((message) => {
    console.log(`${new Date().toISOString()}: ${message}`);
  }, []);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=drawing`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      addLog('Initializing map');
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: 26.2183012, lng: 84.5983613 },
        zoom: 19,
        mapTypeId: 'satellite',
        fullscreenControl: false,
        streetViewControl: false,
      });

      const drawingManagerInstance = new window.google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
          strokeColor: drawingColor,
          strokeWeight: 2,
          fillColor: drawingColor,
          fillOpacity: 0.35,
          editable: true,
          draggable: true,
        },
      });

      drawingManagerInstance.setMap(mapInstance);

      window.google.maps.event.addListener(drawingManagerInstance, 'overlaycomplete', (event) => {
        addLog(`Overlay complete: ${event.type}`);
        const newShape = event.overlay;
        newShape.type = event.type;
        newShape.info = { name: `Area ${shapes.length + 1}`, description: '' };
        setShapes(prevShapes => [...prevShapes, newShape]);
        setActiveShape(newShape);
        drawingManagerInstance.setDrawingMode(null);

        const shapeName = new window.google.maps.Marker({
          position: event.overlay.getPath().getAt(0),
          map: mapInstance,
          label: newShape.info.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
        });

        window.google.maps.event.addListener(newShape, 'click', (e) => {
          setActiveShape(newShape);
          showInfoWindow(newShape, e.latLng);
        });
      });

      setMap(mapInstance);
      setDrawingManager(drawingManagerInstance);
      addLog('Map and drawing manager initialized');
    };

    loadGoogleMapsScript();
  }, [addLog, drawingColor]);

  const toggleDrawingMode = useCallback(() => {
    if (drawingManager) {
      const newMode = drawingManager.getDrawingMode() ? null : 'polygon';
      drawingManager.setDrawingMode(newMode);
      addLog(`Drawing mode toggled: ${newMode ? 'enabled' : 'disabled'}`);
    }
  }, [drawingManager, addLog]);

  const saveMarkings = useCallback(() => {
    addLog('Saving markings');
    const savedData = shapes.map((shape, index) => {
      if (shape.type === 'polygon' && shape.getPath) {
        return {
          type: 'polygon',
          path: shape.getPath().getArray().map(coord => ({ lat: coord.lat(), lng: coord.lng() })),
          info: shape.info || {},
        };
      }
      addLog(`Shape ${index} is not a valid polygon or doesn't have a getPath method`);
      return null;
    }).filter(Boolean);

    const blob = new Blob([JSON.stringify(savedData, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = "map_markings.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog(`Markings saved. Total shapes: ${savedData.length}`);
  }, [shapes, addLog]);

  const deleteActiveShape = useCallback(() => {
    if (activeShape) {
      activeShape.setMap(null);
      setShapes(prevShapes => prevShapes.filter(shape => shape !== activeShape));
      setActiveShape(null);
      addLog('Active shape deleted');
    }
  }, [activeShape, addLog]);

  const showInfoWindow = useCallback((shape, position) => {
    if (infoWindow) {
      infoWindow.close();
    }
    const content = `
      <div>
        <h3>${shape.info.name}</h3>
        <p>${shape.info.description || 'No description'}</p>
        <button onclick="editShapeInfo()">Edit</button>
      </div>
    `;
    const newInfoWindow = new window.google.maps.InfoWindow({
      content: content,
      position: position,
    });
    newInfoWindow.open(map);
    setInfoWindow(newInfoWindow);
  }, [infoWindow, map]);

  const editShapeInfo = useCallback(() => {
    if (activeShape) {
      const newName = prompt('Enter new name:', activeShape.info.name);
      const newDescription = prompt('Enter new description:', activeShape.info.description);
      activeShape.info = { name: newName, description: newDescription };
      setShapes(prevShapes => prevShapes.map(shape => 
        shape === activeShape ? { ...shape, info: { name: newName, description: newDescription } } : shape
      ));
      addLog(`Info updated for shape: ${newName}`);
      if (infoWindow) {
        infoWindow.close();
        showInfoWindow(activeShape, infoWindow.getPosition());
      }
    }
  }, [activeShape, infoWindow, showInfoWindow, addLog]);

  useEffect(() => {
    window.editShapeInfo = editShapeInfo;
  }, [editShapeInfo]);

  return (
    <FullScreenContainer>
      <MapContainer ref={mapRef} />
      <PowerButton active={menuActive} onClick={() => setMenuActive(!menuActive)}>
        ⚡
      </PowerButton>
      {menuActive && (
        <CircularMenu>
          <MenuButton onClick={toggleDrawingMode} style={{ top: 0 }}>✏️</MenuButton>
          <MenuButton onClick={saveMarkings} style={{ right: 0 }}>💾</MenuButton>
          <MenuButton onClick={deleteActiveShape} style={{ bottom: 0 }}>🗑️</MenuButton>
          <MenuButton onClick={() => {}} style={{ left: 0 }}>🔍</MenuButton>
        </CircularMenu>
      )}
      <ColorPicker 
        type="color" 
        value={drawingColor} 
        onChange={(e) => setDrawingColor(e.target.value)}
      />
    </FullScreenContainer>
  );
};

export default MapComponent;