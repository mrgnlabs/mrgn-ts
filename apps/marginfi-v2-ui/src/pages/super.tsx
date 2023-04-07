import React, { FC, useState } from 'react';
import axios from 'axios';
import { TextField } from '@mui/material';


const AiUI: FC = () => {
  const [prompt, setPrompt] = useState(null);
  const [response, setResponse] = useState(null);


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiResponse = await axios.post('/api/openai', {
        prompt: prompt,
        max_tokens: 50,
      });
      setResponse(apiResponse.data.text);
    } catch (error) {
      console.error('Error calling API route:', error);
      setResponse('Error calling API route');
    }
  };

  return (
    <div
      className="top-0 w-full h-full absolute flex flex-col justify-center items-center gap-20"
    >
      <div className="text-7xl" style={{ fontWeight: 500 }}>
        superstake
      </div>
      <form onSubmit={handleSubmit} className="w-3/5">
        <TextField
          fullWidth
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          defaultValue="Superstake 10 mSOL..."
          InputProps={{
            sx: {
              backgroundColor: '#181C1F',
              color: '#354042',
              fontSize: '1rem',
              width: '100%',
              fontFamily: 'Aeonik Pro',
            },
          }}
        />
      </form>
      <div className="min-h-[100px] flex justify-center items-center">
        {response && <div>Response: {response}</div>}
      </div>
    </div>
  )
}

export default AiUI;
