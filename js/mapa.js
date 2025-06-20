
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

const categoriaCoresCorrelacao = {
  "Abaixo / Abaixo": "#3c78d8",
  "Abaixo / Acima": "#16a765",
  "Acima / Abaixo": "#ffad46",
  "Acima / Acima": "#fb4c2f",
  "Sem dados": "lightgray"
};

const svg = d3.select("#mapa");
const width = +svg.attr("width");
const height = +svg.attr("height");
let g = svg.append("g");

const zoom = d3.zoom()
  .scaleExtent([1, 10])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);

// Opções fixas
const opcoesVariacao = [
  { value: "PRISOES", label: "Prisões" },
  { value: "PPRF", label: "PPRF" },
  { value: "MOTOS", label: "Motos" },
  { value: "ONIBUS", label: "Ônibus" },
  { value: "UTILITARIOS", label: "Utilitários" },
  { value: "DIESEL", label: "Diesel" },
  { value: "GASOLINA", label: "Gasolina" }
];

const opcoesCorrelacao = [
  { value: "DIESEL", label: "Diesel" },
  { value: "GASOLINA", label: "Gasolina" }
];

const periodosVariacao = [
  { value: "2000_2010", label: "2000/2001 a 2010" },
  { value: "2010_2022", label: "2010 a 2022" }
];

const periodosCorrelacao = [
  { value: "2000", label: "2000" },
  { value: "2010", label: "2010" },
  { value: "2022", label: "2022" }
];

function atualizarSelect(id, opcoes) {
  const select = document.getElementById(id);
  select.innerHTML = "";
  opcoes.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.text = opt.label;
    select.appendChild(option);
  });
}

function atualizarControles() {
  const configuracao = document.getElementById("configuracao-select").value;

  if (configuracao === "correlacao") {
    atualizarSelect("variavel-select", opcoesCorrelacao);
    atualizarSelect("periodo-select", periodosCorrelacao);
  } else {
    atualizarSelect("variavel-select", opcoesVariacao);
    atualizarSelect("periodo-select", periodosVariacao);
  }

  atualizarMapa();
}

function atualizarMapa() {
  g.selectAll("*").remove();

  const configuracao = document.getElementById("configuracao-select").value;
  const periodo = document.getElementById("periodo-select").value;
  const variavel = document.getElementById("variavel-select").value;
  if (!variavel || !periodo) return;

  const promessas = [
    d3.json("data/BR_Municipios_2023.topojson"),
    d3.json("data/BR_UF_2023.topojson"),
    (configuracao === "correlacao")
      ? d3.json(`data/${variavel}_CORR_${periodo}.json`)
      : d3.json(`data/${variavel}_${periodo}.json`)
  ];

  Promise.all(promessas).then(([topoMun, topoUF, dados]) => {
    const geojsonMun = topojson.feature(topoMun, topoMun.objects.BR_Municipios_2023);
    const geojsonUF = topojson.feature(topoUF, topoUF.objects.BR_UF_2023);

    const projection = d3.geoIdentity().reflectY(true).fitSize([width, height], geojsonMun);
    const path = d3.geoPath().projection(projection);

    const dadosPorCod = {};
    dados.forEach(d => {
      const cod = String(d.cod_ibge).replace(/^0+/, '');
      dadosPorCod[cod] = d.categoria;
    });

    const paleta = configuracao === "correlacao" ? categoriaCoresCorrelacao : categoriaCores;

    g.append("g")
      .selectAll("path")
      .data(geojsonMun.features)
      .join("path")
      .attr("d", path)
      .attr("fill", d => {
        const cod = String(d.properties.CD_MUN6);
        const cat = dadosPorCod[cod] || "Sem dados";
        return paleta[cat] || "lightgray";
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

    g.append("g")
      .selectAll("path")
      .data(geojsonUF.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#000")
      .attr("stroke-width", 1.2);

    desenharLegenda(configuracao, variavel);
  });
}

function desenharLegenda(configuracao, variavel) {
  const container = d3.select("#legenda");
  container.selectAll("*").remove();

  if (configuracao === "correlacao") {
    Object.entries(categoriaCoresCorrelacao).forEach(([categoria, cor]) => {
      const item = container.append("div").attr("class", "legenda-item");
      item.append("div").attr("class", "legenda-cor").style("background-color", cor);
      item.append("span").text(categoria);
    });
    return;
  }

  const correspondencias = {
    "PRISOES": "prisões",
    "PPRF": "pprf",
    "MOTOS": "motos",
    "ONIBUS": "ônibus",
    "UTILITARIOS": "utilitários",
    "DIESEL": "diesel",
    "GASOLINA": "gasolina"
  };

  const termo = correspondencias[variavel] || "variável";

  Object.entries(categoriaCores).forEach(([categoria, cor]) => {
    const rotulo = categoria.replace("veículos", termo);
    const item = container.append("div").attr("class", "legenda-item");
    item.append("div").attr("class", "legenda-cor").style("background-color", cor);
    item.append("span").text(rotulo);
  });
}

document.getElementById("configuracao-select").addEventListener("change", atualizarControles);
document.getElementById("variavel-select").addEventListener("change", atualizarMapa);
document.getElementById("periodo-select").addEventListener("change", atualizarMapa);

atualizarControles();
