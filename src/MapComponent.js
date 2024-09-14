import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';

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

const ActionMenu = styled.div`
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
  transition: all 0.3s ease;
`;

const MenuButton = styled.button`
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: ${props => props.color};
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

const PowerButton = styled(MenuButton)`
  z-index: 1001;
  background-color: ${props => props.active ? '#4CAF50' : '#F44336'};
`;

const ColorStrip = styled.div`
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 120px;
  background: linear-gradient(to bottom, red, orange, yellow, green, blue, indigo, violet);
  border-radius: 15px 0 0 15px;
`;

const ColorButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid white;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const InfoForm = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  z-index: 1000;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background-color: #3498db;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #2980b9;
  }
`;

const MapComponent = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [activeShape, setActiveShape] = useState(null);
  const [menuActive, setMenuActive] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#FF0000');
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const addLog = useCallback((message) => {
    console.log(`${new Date().toISOString()}: ${message}`);
  }, []);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=drawing,geometry`;
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
        setShapes(prevShapes => [...prevShapes, newShape]);
        setActiveShape(newShape);
        setShowInfoForm(true);
        drawingManagerInstance.setDrawingMode(null);

        window.google.maps.event.addListener(newShape, 'click', () => {
          setActiveShape(newShape);
          setFormData(newShape.info || { name: '', description: '' });
          setShowInfoForm(true);
        });
      });

      setMap(mapInstance);
      setDrawingManager(drawingManagerInstance);
      addLog('Map and drawing manager initialized');
    };

    loadGoogleMapsScript();
  }, [addLog]);

  useEffect(() => {
    if (drawingManager) {
      drawingManager.setOptions({
        polygonOptions: {
          ...drawingManager.get('polygonOptions'),
          strokeColor: drawingColor,
          fillColor: drawingColor,
        },
      });
    }
  }, [drawingColor, drawingManager]);

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
          strokeColor: shape.strokeColor,
          fillColor: shape.fillColor,
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
      setShowInfoForm(false);
      addLog('Active shape deleted');
    }
  }, [activeShape, addLog]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveShapeInfo = () => {
    if (activeShape) {
      activeShape.info = formData;
      setShapes(prevShapes => prevShapes.map(shape => 
        shape === activeShape ? { ...shape, info: formData } : shape
      ));
      addLog(`Info saved for shape: ${formData.name}`);
      setShowInfoForm(false);

      // Add or update label
      if (activeShape.label) {
        activeShape.label.setMap(null);
      }
      const center = window.google.maps.geometry.spherical.interpolate(
        activeShape.getPath().getAt(0),
        activeShape.getPath().getAt(2),
        0.5
      );
      activeShape.label = new window.google.maps.Marker({
        position: center,
        map: map,
        label: {
          text: formData.name,
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold'
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 0
        }
      });
    }
  };

  const colorOptions = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  const handleColorChange = (color) => {
    setDrawingColor(color);
    addLog(`Drawing color changed to: ${color}`);
  };

  return (
    <FullScreenContainer>
      <MapContainer ref={mapRef} />
      <ActionMenu>
        <ColorStrip />
        <PowerButton 
          active={menuActive} 
          onClick={() => setMenuActive(!menuActive)}
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          ⚡
        </PowerButton>
        {menuActive && (
          <>
            <MenuButton onClick={toggleDrawingMode} style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }} color="#4CAF50">✏️</MenuButton>
            <MenuButton onClick={() => {}} style={{ top: '25%', right: 0 }} color="#FF0000">📍</MenuButton>
            <MenuButton onClick={deleteActiveShape} style={{ bottom: '25%', right: 0 }} color="#FF0000">🗑️</MenuButton>
            <MenuButton onClick={saveMarkings} style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }} color="#2196F3">💾</MenuButton>
            <MenuButton onClick={() => {}} style={{ bottom: '25%', left: 0 }} color="#FFC107">🔍</MenuButton>
            <div style={{ position: 'absolute', top: '25%', left: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {colorOptions.map((color) => (
                <ColorButton
                  key={color}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
          </>
        )}
      </ActionMenu>
      {showInfoForm && (
        <InfoForm>
          <Input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter area name"
          />
          <TextArea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter area description"
          />
          <Button onClick={saveShapeInfo}>Save Info</Button>
        </InfoForm>
      )}
    </FullScreenContainer>
  );
};

export default MapComponent;