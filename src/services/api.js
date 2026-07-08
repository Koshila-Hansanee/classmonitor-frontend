const API_BASE = 'http://localhost:8000/api';

export const analyzeSpeech = async (audioFile) => {
  const formData = new FormData();
  formData.append('file', audioFile);
  
  const response = await fetch(`${API_BASE}/cognitive-load/speech`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

export const analyzeVision = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);
  
  const response = await fetch(`${API_BASE}/cognitive-load/vision`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};