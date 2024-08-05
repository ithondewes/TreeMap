const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/dados', async (req, res) => {
  try {
    const response = await axios.get('https://run.mocky.io/v3/908998f0-e7fb-4e04-91b7-0dda916e6b89');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar dados' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
