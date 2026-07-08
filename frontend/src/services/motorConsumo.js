// Motor de consumo/custo por sessao — porte fiel do motor validado da escola.
// Validacao (bate ao centimo):
//   MIG 5h, fator 0.25, 8 chapas  -> total 30.91 EUR (6.18 EUR/h)
//   TIG 4h, fator 0.20, 10 tubos  -> total 18.99 EUR (4.75 EUR/h)
// NAO alterar as formulas (fonte de verdade).

export const PARAMETROS_PADRAO = {
  mig: {
    chapaAmm: 200, chapaBmm: 100, espessuraMm: 6, precoAcoKg: 1.2,
    arameDiamMm: 1.0, wfsMMin: 6.0, precoArameKg: 2.5,
    vazaoLMin: 14, fatorDesperdicioGas: 1.3,
    garrafaM3: 10.7, precoGarrafa: 95.0,
    overhead: 0.1, taxaPecasHora: 1.6,
  },
  tig: {
    tuboOdMm: 60.3, espessuraMm: 3, comprimentoMm: 100, precoTuboKg: 2.0,
    deposicaoKgH: 0.35, fatorPerdaVareta: 1.3, precoVaretaKg: 5.0,
    vazaoLMin: 9, fatorDesperdicioGas: 1.4,
    garrafaM3: 10.7, precoGarrafa: 110.0,
    overhead: 0.15, taxaPecasHora: 2.5,
  },
  fatorArcoPorNivel: { 0: 0.25, 1: 0.25, 2: 0.3, 3: 0.35, 4: 0.4 },
};

const r2 = (x) => Math.round(x * 100) / 100;

export function massaChapaKg(p) {
  return p.chapaAmm * p.chapaBmm * p.espessuraMm * 7.85e-6;
}

export function massaTuboKg(p) {
  return ((p.tuboOdMm - p.espessuraMm) * p.espessuraMm * 0.02466 * p.comprimentoMm) / 1000;
}

export function custoPeca(proc, params) {
  return proc === 'mig'
    ? massaChapaKg(params.mig) * params.mig.precoAcoKg
    : massaTuboKg(params.tig) * params.tig.precoTuboKg;
}

export function precoGasM3(proc, params) {
  const p = params[proc];
  return p.precoGarrafa / p.garrafaM3;
}

export function custoMinArco(proc, params) {
  const p = params[proc];
  const gas = (p.vazaoLMin * p.fatorDesperdicioGas * precoGasM3(proc, params)) / 1000;
  let metal;
  if (proc === 'mig') {
    const gPorM = (Math.PI / 4) * Math.pow(params.mig.arameDiamMm, 2) * 7.85;
    metal = (params.mig.wfsMMin * gPorM / 1000) * params.mig.precoArameKg;
  } else {
    metal = (params.tig.deposicaoKgH / 60) * params.tig.fatorPerdaVareta * params.tig.precoVaretaKg;
  }
  return metal + gas;
}

export function consumoSessao(proc, params, horas, fatorArco, pecas) {
  const p = params[proc];
  const arcoMin = horas * 60 * fatorArco;
  const custoPecas = pecas * custoPeca(proc, params);
  const custoArco = arcoMin * custoMinArco(proc, params);
  const total = (custoPecas + custoArco) * (1 + p.overhead);
  let metalKg;
  if (proc === 'mig') {
    const gPorM = (Math.PI / 4) * Math.pow(params.mig.arameDiamMm, 2) * 7.85;
    metalKg = (arcoMin * params.mig.wfsMMin * gPorM) / 1000;
  } else {
    metalKg = (arcoMin / 60) * params.tig.deposicaoKgH * params.tig.fatorPerdaVareta;
  }
  const massaUnit = proc === 'mig' ? massaChapaKg(params.mig) : massaTuboKg(params.tig);
  return {
    arcoMin: Math.round(arcoMin),
    pecas,
    materialKg: r2(pecas * massaUnit),
    metalAdicaoKg: r2(metalKg),
    gasM3: r2((arcoMin * p.vazaoLMin * p.fatorDesperdicioGas) / 1000),
    custoPecas: r2(custoPecas),
    custoArco: r2(custoArco),
    total: r2(total),
    porHora: r2(horas > 0 ? total / horas : 0),
  };
}

// Posicoes de soldadura -> multiplicador do fator de arco (vertical/sobrecabeca
// reduzem o tempo de arco contínuo).
export const POSICOES = [
  { key: 'PA', nome: 'PA — Plana', mult: 1.0 },
  { key: 'PB', nome: 'PB — Horizontal', mult: 1.0 },
  { key: 'PF', nome: 'PF — Vertical ascendente', mult: 0.9 },
  { key: 'PC', nome: 'PC — Horizontal em tubo', mult: 0.9 },
  { key: 'PE', nome: 'PE — Sobrecabeça', mult: 0.8 },
];

export const pecasSugeridas = (proc, params, horas) => Math.max(1, Math.ceil(horas * params[proc].taxaPecasHora));
