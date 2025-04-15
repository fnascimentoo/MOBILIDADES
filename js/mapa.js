const categoriaCores = {
  "Aumentou (ambos)": "#9f1127",
  "Aumentou (homicídios)": "#df755d",
  "Aumentou (PPRF)": "#fbd2bc",
  "Aumentou (veículos)": "#fbd2bc",
  "Aumentou (prisões)": "#fbd2bc",
  "Aumentou (homicídios) / Diminuiu (PPRF)": "#b87495",
  "Aumentou (homicídios) / Diminuiu (veículos)": "#b87495",
  "Aumentou (homicídios) / Diminuiu (prisões)": "#b87495",
  "Manteve-se": "#fff3ca",
  "Diminuiu (homicídios) / Aumentou (PPRF)": "#69ad8e",
  "Diminuiu (homicídios) / Aumentou (veículos)": "#69ad8e",
  "Diminuiu (homicídios) / Aumentou (prisões)": "#69ad8e",
  "Diminuiu (homicídios)": "#c7dfec",
  "Diminuiu (PPRF)": "#5aa2c9",
  "Diminuiu (veículos)": "#5aa2c9",
  "Diminuiu (prisões)": "#5aa2c9",
  "Diminuiu (ambos)": "#185898",
  "Sem dados": "lightgray"
};

const svg = d3.select("#mapa");
const width = +svg.attr("width");
const height = +svg.attr("height");
let g = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([1, 10]) // níveis de zoom permitidos
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);


function atualizarMapa() {
  g.selectAll("*").remove();

  const periodo = document.getElementById("periodo-select").value;
  const variaveisSelecionadas = Array.from(document.getElementById("variavel-select").selectedOptions).map(o => o.value);
  if (variaveisSelecionadas.length === 0) return;

  const promessas = [
    d3.json("data/BR_Municipios_2023.topojson"),
    d3.json("data/BR_UF_2023.topojson"),
    ...variaveisSelecionadas.map(v => d3.json(`data/${v}_${periodo}.json`))
  ];

  Promise.all(promessas).then(([topoMun, topoUF, ...camadas]) => {
    const geojsonMun = topojson.feature(topoMun, topoMun.objects.BR_Municipios_2023);
    const geojsonUF = topojson.feature(topoUF, topoUF.objects.BR_UF_2023);

    const projection = d3.geoIdentity().reflectY(true).fitSize([width, height], geojsonMun);
    const path = d3.geoPath().projection(projection);

    // Desenha as camadas municipais com cor por categoria
    camadas.forEach((dados, i) => {
      const dadosPorCod = {};
      dados.forEach(d => {
        const cod = String(d.cod_ibge).replace(/^0+/, ''); // 6 dígitos
        dadosPorCod[cod] = d.categoria;
      });

      g.append("g")
        .selectAll("path")
        .data(geojsonMun.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
          const cod = String(d.properties.CD_MUN6);
          const cat = dadosPorCod[cod] || "Sem dados";
          return categoriaCores[cat] || "lightgray";
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 0.2)
        .append("title")
        .text(d => {
          const nome = d.properties.NM_MUN || "Município";
          const cod = String(d.properties.CD_MUN6);
          const cat = dadosPorCod[cod] || "Sem dados";
          return `${nome}\n${cat}`;
        });
    });

    // Adiciona contorno das Unidades da Federação
    g.append("g")
      .selectAll("path")
      .data(geojsonUF.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", 1.2);

    desenharLegenda();
  });
}

function desenharLegenda() {
  const container = d3.select("#legenda");
  container.selectAll("*").remove();

  const variaveisSelecionadas = Array.from(document.getElementById("variavel-select").selectedOptions)
    .map(o => o.value);

  const correspondencias = {
    "PRISOES": "prisões",
    "PPRF": "pprf",
    "MOTOS": "veículos",
    "ONIBUS": "veículos",
    "UTILITARIOS": "veículos"
  };

  const labelPersonalizada = {
    "MOTOS": "motos",
    "ONIBUS": "ônibus",
    "UTILITARIOS": "utilitários"
  };

  // Detecta se uma e apenas uma das variáveis de veículos está selecionada
  const veiculosSelecionados = variaveisSelecionadas.filter(v => ["MOTOS", "ONIBUS", "UTILITARIOS"].includes(v));
  const termoVeiculo = veiculosSelecionados.length === 1 ? labelPersonalizada[veiculosSelecionados[0]] : "veículos";

  const termosSelecionados = new Set();
  variaveisSelecionadas.forEach(v => {
    if (correspondencias[v]) {
      termosSelecionados.add(correspondencias[v]);
    }
  });

  const categoriasFiltradas = Object.entries(categoriaCores).filter(([nome]) => {
    const lower = nome.toLowerCase();

    const ehGenerica =
      !lower.includes("pprf") &&
      !lower.includes("prisões") &&
      !lower.includes("veículos");

    const ehRelevante =
      Array.from(termosSelecionados).some(termo => lower.includes(termo));

    return ehGenerica || ehRelevante;
  });

  categoriasFiltradas.forEach(([categoria, cor]) => {
    // Substituir "veículos" pelo termo específico (motos, ônibus etc.)
    const rotulo = categoria.replace("veículos", termoVeiculo);

    const item = container.append("div").attr("class", "legenda-item");
    item.append("div")
      .attr("class", "legenda-cor")
      .style("background-color", cor);
    item.append("span").text(rotulo);
  });
}


document.getElementById("variavel-select").addEventListener("change", atualizarMapa);
document.getElementById("periodo-select").addEventListener("change", atualizarMapa);

atualizarMapa();
