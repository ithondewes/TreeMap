document.addEventListener('DOMContentLoaded', function () {
  const periodoSelect = document.getElementById('periodo');
  const valorSelect = document.getElementById('valor');
  const areaSelect = document.getElementById('area');
  const infoBox = document.getElementById('infoBox');
  const infoIcon = document.createElement('i');
  infoIcon.className = 'fas fa-info-circle info-icon';
  document.body.appendChild(infoIcon);

  periodoSelect.addEventListener('change', atualizarGrafico);
  valorSelect.addEventListener('change', atualizarGrafico);
  areaSelect.addEventListener('change', atualizarGrafico);

  fetch('/dados')
    .then(response => response.json())
    .then(data => {
      console.log('Dados recebidos:', data);
      const transacoesPorTipo = data.transacoes_por_tipo_de_imovel;
      const dados = [];
      for (const tipo in transacoesPorTipo) {
        transacoesPorTipo[tipo].forEach(transacao => {
          transacao.type = tipo;
          dados.push(transacao);
        });
      }
      console.log('Dados transformados:', dados);
      window.dadosImobiliarios = dados;
      atualizarGrafico();
    })
    .catch(error => console.error('Erro ao buscar dados:', error));

  function atualizarGrafico() {
    const periodo = periodoSelect.value;
    const valor = valorSelect.value;
    const area = areaSelect.value;

    const dadosFiltrados = filtrarDados(window.dadosImobiliarios, periodo, valor, area);
    desenharTreemap(dadosFiltrados);
  }

  function filtrarDados(dados, periodo, valor, area) {
    console.log('Filtrando dados:', dados);
    
    const agora = new Date();
    
    const filtroPeriodo = {
      'all': () => true,
      'last-30': item => {
        const dataItem = new Date(item.data);
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(agora.getDate() - 30);
        return dataItem >= trintaDiasAtras;
      },
      'last-90': item => {
        const dataItem = new Date(item.data);
        const noventaDiasAtras = new Date();
        noventaDiasAtras.setDate(agora.getDate() - 90);
        return dataItem >= noventaDiasAtras;
      },
      'last-year': item => {
        const dataItem = new Date(item.data);
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(agora.getFullYear() - 1);
        return dataItem >= umAnoAtras;
      },
    };

    const filtroValor = {
      'all': () => true,
      '0-100k': item => item.valor <= 100000,
      '100k-500k': item => item.valor > 100000 && item.valor <= 500000,
      '500k+': item => item.valor > 500000,
    };

    const filtroArea = {
      'all': () => true,
      '0-50': item => item.area <= 50,
      '50-100': item => item.area > 50 && item.area <= 100,
      '100+': item => item.area > 100,
    };

    return dados.filter(item => 
      filtroPeriodo[periodo](item) && 
      filtroValor[valor](item) && 
      filtroArea[area](item)
    );
  }

  function desenharTreemap(dados) {
    const grafico = document.getElementById('grafico');
    grafico.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 500;
    grafico.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    const largura = 960;
    const altura = 500;
    const alturaTitulo = 20; 
    const espacoBlocos = 5; 
    const cores = {
      'Apartamento': '#e57373',
      'Casa': '#fff176',
      'Comercial': '#64b5f6',
      'Terreno': '#81c784',
      'Rural': '#a1887f',
      'Área Rural': '#ba68c8',
      'Galpao': '#ffb74d',
      'Sala Comercial': '#90a4ae',
      'Sitio': '#ce93d8',
      'Casa Geminada': '#ffcc80'
    };

    const nestedData = dados.reduce((acc, item) => {
      const tipo = item.type
        .replace('Area_Rural', 'Área Rural')
        .replace('Sala_Comercial', 'Sala Comercial')
        .replace('Casa_Geminada', 'Casa Geminada');
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(item);
      return acc;
    }, {});

    const tipos = Object.keys(nestedData);
    const larguraColuna = largura / tipos.length;

    tipos.forEach((tipo, i) => {
      const x = i * larguraColuna;
      ctx.fillStyle = '#fff'; 
      ctx.fillRect(x, 0, larguraColuna, alturaTitulo); 
      ctx.fillStyle = '#000'; 
      ctx.font = '14px Arial'; 
      ctx.textAlign = 'center';
      ctx.fillText(tipo, x + larguraColuna / 2, alturaTitulo / 2 + 5);

      const totalValue = nestedData[tipo].reduce((acc, item) => acc + item.valor, 0);
      let currentY = alturaTitulo;

      nestedData[tipo].forEach(item => {
        const itemHeight = (item.valor / totalValue) * (altura - alturaTitulo - (nestedData[tipo].length - 1) * espacoBlocos);
        ctx.fillStyle = cores[tipo];
        ctx.fillRect(x, currentY, larguraColuna, itemHeight);

        item._bounds = {
          x0: x,
          y0: currentY,
          x1: x + larguraColuna,
          y1: currentY + itemHeight
        };

        currentY += itemHeight + espacoBlocos;
      });
    });

    canvas.addEventListener('mousemove', function (event) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      let itemEncontrado = false;

      for (const tipo of tipos) {
        for (const item of nestedData[tipo]) {
          const bounds = item._bounds;
          if (
            mouseX >= bounds.x0 &&
            mouseX <= bounds.x1 &&
            mouseY >= bounds.y0 &&
            mouseY <= bounds.y1
          ) {
            infoBox.style.display = 'block';
            infoBox.style.left = `${event.pageX + 10}px`;
            infoBox.style.top = `${event.pageY + 10}px`;
            infoBox.innerHTML = `
              <strong>Tipo:</strong> ${item.type}<br>
              <strong>Data:</strong> ${item.data}<br>
              <strong>Valor:</strong> R$ ${item.valor.toLocaleString('pt-BR')}<br>
              <strong>Área:</strong> ${item.area} m²<br>
              <strong>Quartos:</strong> ${item.quartos}<br>
              <strong>Banheiros:</strong> ${item.banheiros}<br>
              <strong>Garagem:</strong> ${item.garagem}
            `;
            infoIcon.style.display = 'block';
            infoIcon.style.left = `${event.pageX}px`;
            infoIcon.style.top = `${event.pageY - 30}px`;
            itemEncontrado = true;
            break;
          }
        }
        if (itemEncontrado) break;
      }
      if (!itemEncontrado) {
        infoBox.style.display = 'none';
        infoIcon.style.display = 'none';
      }
    });
  }
});
