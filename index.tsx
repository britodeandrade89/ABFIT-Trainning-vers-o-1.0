// Fix: Add declarations for external libraries to prevent TypeScript errors.
declare var feather: any;
declare var L: any;
declare var Chart: any;

// --- DATABASE ---
const database = {
    // Fix: Added `weightHistory` to user objects to match its usage in the app and satisfy TypeScript's type inference. This resolves multiple errors in `renderWeightControlScreen`.
    users: [
        { id: 1, name: 'André Brito', email: 'britodeandrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3Zy4n6ZmWp9DW98VtXpO.jpeg', weightHistory: [] },
        { id: 2, name: 'Marcelly Bispo', email: 'marcellybispo92@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/2VWhNV4eSyDNkwEzPGvq.jpeg', weightHistory: [] },
        { id: 3, name: 'Marcia Brito', email: 'andrademarcia.ucam@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/huS3I3wDTHbXGY1EuLjf.jpg', weightHistory: [] },
        { id: 4, name: 'Liliane Torres', email: 'lilicatorres@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ebw5cplf2cypx4laU7fu.jpg', weightHistory: [] },
        { id: 5, name: 'Rebecca Brito', email: 'arbrito.andrade@gmail.com', photo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/WjeZGiT8uQKPhfXmxrCe.jpeg', weightHistory: [] }
    ],
    // Fix: Added `periodizacao` to the trainingPlans object to match its later assignment, resolving type errors on lines 212 and 506.
    trainingPlans: {
        treinosA: {},
        treinosB: {},
        periodizacao: {}
    },
    userRunningWorkouts: {}
};

// --- SISTEMA DE AVALIAção FÍSICA ---
const PHYSIO_DB_KEY = 'abfit_physio_alunos';
const getPhysioAlunosFromStorage = () => JSON.parse(localStorage.getItem(PHYSIO_DB_KEY) || '[]');
const savePhysioAlunosToStorage = (alunosData) => localStorage.setItem(PHYSIO_DB_KEY, JSON.stringify(alunosData));
const calculateBodyComposition = (avaliacao, aluno) => {
    const idade = aluno.nascimento ? new Date().getFullYear() - new Date(aluno.nascimento).getFullYear() : 0;
    const sexo = aluno.sexo;
    const peso = avaliacao.peso;
    // Fix: Corrected typo from `avaliaco` to `avaliacao`.
    const altura = avaliacao.altura;
    if (!peso || !altura) return {};
    const imc = (peso / ((altura / 100) ** 2));
    let somaDobras = 0;
    if (sexo === 'Masculino') {
        somaDobras = (parseFloat(avaliacao.dc_peitoral) || 0) + (parseFloat(avaliacao.dc_abdominal) || 0) + (parseFloat(avaliacao.dc_coxa) || 0);
    } else { // Feminino
        somaDobras = (parseFloat(avaliacao.dc_tricipital) || 0) + (parseFloat(avaliacao.dc_suprailiaca) || 0) + (parseFloat(avaliacao.dc_coxa) || 0);
    }
    if (somaDobras === 0 || !idade || !sexo) {
        return { imc: imc.toFixed(1) };
    }
    let densidadeCorporal = 0;
    if (sexo === 'Masculino') {
        densidadeCorporal = 1.10938 - (0.0008267 * somaDobras) + (0.0000016 * (somaDobras ** 2)) - (0.0002574 * idade);
    } else { // Feminino
        densidadeCorporal = 1.0994921 - (0.0009929 * somaDobras) + (0.0000023 * (somaDobras ** 2)) - (0.0001392 * idade);
    }
    const percentualGordura = densidadeCorporal > 0 ? ((4.95 / densidadeCorporal) - 4.5) * 100 : 0;
    const pesoGordo = peso * (percentualGordura / 100);
    const pesoMagro = peso - pesoGordo;
    return {
        somaDobras: somaDobras.toFixed(1),
        densidadeCorporal: densidadeCorporal.toFixed(4),
        percentualGordura: percentualGordura.toFixed(1),
        pesoGordo: pesoGordo.toFixed(1),
        pesoMagro: pesoMagro.toFixed(1),
        imc: imc.toFixed(1)
    };
};

// --- OFFLINE STORAGE SYSTEM ---
const STORAGE_KEYS = {
    DATABASE: 'abfit_database',
    PENDING_SYNC: 'abfit_pending_sync',
    LAST_SYNC: 'abfit_last_sync',
    CURRENT_USER: 'abfit_current_user'
};
function getDatabase() {
    const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
    if (saved) return JSON.parse(saved);
    return database; // Retorna o objeto default se não houver nada salvo
}
function saveDatabase(db) {
    localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(db));
}
function getCurrentUser() { return localStorage.getItem(STORAGE_KEYS.CURRENT_USER); }
function setCurrentUser(email) { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, email); }

function generateCyclicRunningWorkouts(baseWorkouts) {
    if (!baseWorkouts || baseWorkouts.length === 0) return [];

    const extendedWorkouts = [...baseWorkouts];
    const baseCycle = [...baseWorkouts];
    const lastWorkoutDateStr = baseWorkouts[baseWorkouts.length - 1].date;

    let currentDate = new Date(`${lastWorkoutDateStr}T12:00:00Z`); // Use a fixed time to avoid timezone issues
    currentDate.setDate(currentDate.getDate() + 1); // Start from the next day

    const endDate = new Date('2024-12-31T12:00:00Z');
    let cycleIndex = 0;

    while (currentDate <= endDate) {
        const baseWorkout = baseCycle[cycleIndex % baseCycle.length];
        extendedWorkouts.push({
            ...baseWorkout,
            date: currentDate.toISOString().split('T')[0],
            completed: false,
            performance: null,
        });
        currentDate.setDate(currentDate.getDate() + 1);
        cycleIndex++;
    }
    return extendedWorkouts;
}


function initializeDatabase() {
    const savedDB = JSON.parse(localStorage.getItem(STORAGE_KEYS.DATABASE));
    if (savedDB) {
        Object.assign(database, savedDB);
        console.log('Dados carregados do armazenamento local');
        return;
    }

    const periodizacaoPlano1 = [
        { week: '1ª e 2ª', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '15', volume: '6 séries/grupo', intensity: '50-60% 1RM', recovery: '30 Seg' },
        { week: '3ª e 4ª', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '13', volume: '6 séries/grupo', intensity: '50-60% 1RM', recovery: '30 Seg' },
        { week: '5ª e 6ª', phase: 'Força', methods: 'Método de execução Simples', reps: '11', volume: '6 séries/grupo', intensity: '50-60% 1RM', recovery: '30 Seg' },
        { week: '7ª e 8ª', phase: 'Força', methods: 'Método de execução Simples', reps: '9', volume: '9 séries/grupo', intensity: '70-75% 1RM', recovery: '30 Seg' },
        { week: '9ª e 10ª', phase: 'Força', methods: 'Método de execução Simples', reps: '8', volume: '9 séries/grupo', intensity: '70-75% 1RM', recovery: '30 Seg' },
        { week: '11ª, 12ª e 13ª', phase: 'Força', methods: 'Método de execução Pirâmide crescente de carga', reps: '12/10/8', volume: '9 séries/grupo', intensity: '70-75% 1RM', recovery: '30 Seg' },
    ];
    
    const periodizacaoPlano2 = [
        { week: '1ª e 2ª Semanas', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '10', volume: '16 séries/grupo', intensity: '70-75% 1RM', recovery: '60-90s', metodo_desc: 'Método de execução Simples', descricao: 'Realizar o número prescrito de repetições com a carga determinada, mantendo técnica adequada em todas as repetições.' },
        { week: '3ª e 4ª Semanas', phase: 'Adaptação/Hipertrofia', methods: 'Método de execução Simples', reps: '8-9', volume: '16 séries/grupo', intensity: '70-75% 1RM', recovery: '60-90s', metodo_desc: 'Método Rest-Pause', descricao: 'Realizar uma série até a falha concêntrica, descansar apenas 10 segundos, realizar mais repetições até nova falha, repetir o total de séries prescritas por exercício.' },
        { week: '5ª e 6ª Semanas', phase: 'Força', methods: 'Método de execução Simples + Rest-Pause', reps: '6-7', volume: '14 séries/grupo', intensity: '80-85% 1RM', recovery: '90-120s', metodo_desc: 'Método Pirâmide Decrescente', descricao: 'Iniciar com carga para o número de repetições alvo, reduzir 2% da carga e realizar + 1 repetição, repetir o processo 3 vezes, ou seja, sempre manter a carga e aumentar as repetições a cada série.' },
        { week: '7ª e 8ª Semanas', phase: 'Força', methods: 'Método de execução Simples + Rest-Pause', reps: '5-6', volume: '12 séries/grupo', intensity: '80-85% 1RM', recovery: '90-120s', metodo_desc: null, descricao: null },
        { week: '9ª e 10ª Semanas', phase: 'Força Máxima', methods: 'Método de execução Simples + Pirâmide', reps: '3 / 4 / 5', volume: '10 séries/grupo', intensity: '85-90% 1RM', recovery: '120-180s', metodo_desc: null, descricao: null },
        { week: '11ª Semana', phase: 'Força Máxima', methods: 'Método de execução Simples + Rest-Pause + Pirâmide', reps: '3 / 4 / 5', volume: '10 séries/grupo', intensity: '85-90% 1RM', recovery: '120-180s', metodo_desc: null, descricao: null },
        { week: '12ª e 13ª Semanas', phase: 'Deload', methods: 'Método de execução Simples (recuperação)', reps: '6-8', volume: '8 séries/grupo', intensity: '50-60% 1RM', recovery: '60s', metodo_desc: null, descricao: null },
    ];
    
    const periodizacaoPorUsuario = {
        'britodeandrade@gmail.com': periodizacaoPlano2,
        'marcellybispo92@gmail.com': periodizacaoPlano2,
        'andrademarcia.ucam@gmail.com': periodizacaoPlano1,
        'lilicatorres@gmail.com': periodizacaoPlano1,
        'arbrito.andrade@gmail.com': periodizacaoPlano1,
    };

    const treinosA = {
        'britodeandrade@gmail.com': [
            { name: 'Agachamento parcial no Smith', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/dMXSfHrCe2BQAKRvIvIg.png', sets: '4', reps: '10', carga: '15', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Agachamento Livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/lik7g55hYpUjX2Rs6ASg.png', sets: '4', reps: '10', carga: '14', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/CGVAnjor7i6F1Xj1IQoK.png', sets: '4', reps: '10', carga: '5', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Supino inclinado com HBC (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/WyYlLuQ2Ch6WAXdVcwHL.png', sets: '3', reps: '10', carga: '12', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Extensão de cotovelos no solo (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/kmM09RrmttVVMNq2Vvae.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Crucifixo aberto na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/rhLOUSYFlEMyTYyADYUQ.png', sets: '6', reps: '10', carga: '8', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto com HBC no banco 75º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ZbQ5zsR6jdwmbE956eOa.png', sets: '4', reps: '10', carga: '7', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Tríceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/OT1w5MN9V9Esd8B4muUH.png', sets: '6', reps: '10', carga: '6', obs: 'Método Simples (10 RM)', recovery: '30s' }
        ],
        'marcellybispo92@gmail.com': [
            { name: 'Agachamento Livre', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Rco3wwXc2fMICrkoKl2c.png', sets: '3', reps: '20', carga: '0', obs: 'Método Simples (20 RM)', recovery: '30s' },
            { name: 'Agachamento Livre em isometria', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/AOCzLpKQwD10WwAYARZz.png', sets: '3', reps: '20', carga: '0', obs: 'Método Simples (20 RM)', recovery: '30s' },
            { name: 'Agachamento Livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/s3EEHvDgNM2noyrFu942.png', sets: '4', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Agachamento em passada com HBC e joelho encostando no step', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/4EYSuDx7ReXCgBd2KkFJ.jpg', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/r6yfXvdiiDfGnxXxNIBO.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Supino aberto banco reto com HBL', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/vOmGdQZbnsFoBoyDsQK6.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/nqg5uBvdfqzIvgMUDpSy.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Tríceps no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/2r3HFHUsIrmKlDW7IQSw.png', sets: '3', reps: '10', carga: '0', obs: '', recovery: '' }
        ],
        'andrademarcia.ucam@gmail.com': [
            { name: 'Levantar e sentar de um banco reto com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/gzrfW5iW6Apsl4Q2pLXa.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Supino reto com HBC no banco reto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sViJmpz2dQopPzlducWx.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Abdominal supra no banco reto ou inclinado 30º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/uia6QHw6AzFxc1O99Ijz.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Leg press horizontal + flexão plantar', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/7yRR2CeoHxGPlbi3mw89.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto com HBC no banco 75º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/IfEmY5yvPUFOjyvLL1l5.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/lSKqgGqYChpRHitndPVZ.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' }
        ],
        'lilicatorres@gmail.com': [
            { name: 'Leg press horizontal', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/TYYs8dYewPrOA5MB0LKt.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Supino reto aberto na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/64gf4FLADApgXflx6DCT.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Abdominal supra no banco reto ou inclinado 30º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/LSVHRPVB8key1bttEGPz.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/BDBVsJS1WneT1BvLSW9S.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto com HBC no banco 75º', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/qTH2XHNPet3GTANl0VaM.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira adutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/5U2jakkNhbxXnMTXemsl.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' }
        ],
        'arbrito.andrade@gmail.com': [
            { name: 'Leg press inclinado + Flexão plantar', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/9rA4h81jw0eAMF5qBrsj.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Agachamento parcial livre com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/tYJPT50FdlFb0nq49lbE.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Cadeira extensora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/0HnHc7UmLPWgOpiJbVkF.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Supino aberto na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/AA86qmJ1ykWY6CkpkybC.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Desenvolvimento aberto em pé com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/4YoxCSwONKp1YMGmgc5b.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Tríceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/DpUoWnRfyAEqegSJ567P.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Abdominal supra no solo', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/mnXs908TPzy2WU0kgNGd.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' }
        ]
    };

    const treinosB = {
        'britodeandrade@gmail.com': [
            { name: 'Agachamento sumô com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/XWSqloYwKucvRjtu5vEh.png', sets: '4', reps: '10', carga: '22', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Stiff em pé com HBM', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/AOg50LojEKhCF6E4WA95.png', sets: '4', reps: '10', carga: '14', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Extensão de quadril com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/H0mkj0hrfyfWwcD3Kiji.png', sets: '4', reps: '10', carga: '7', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Remada curvada aberta com HBC (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/EpO1XQEqBEZRk5fiO1SF.png', sets: '3', reps: '10', carga: '8', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Crucifixo inverso curvado com HBC (CONJUGADO 1)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/HSKDTQoF1qrcgndeYxls.png', sets: '3', reps: '10', carga: '4', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Crucifixo inverso na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/KQjB5PJHrOXvVDADQ9Z3.png', sets: '6', reps: '10', carga: '6', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ehWDEGS6Z3S8dswAxczt.png', sets: '4', reps: '10', carga: '11', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Bíceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/BB2HhbKsbNbV0CyYUrnV.avif', sets: '6', reps: '10', carga: '10', obs: 'Método Simples (10 RM)', recovery: '30s' }
        ],
        'marcellybispo92@gmail.com': [
            { name: 'Agachamento Livre', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/9bgKMf2SJ3Dpq9EnDPsV.png', sets: '3', reps: '20', carga: '0', obs: 'Método Simples (20 RM)', recovery: '30s' },
            { name: 'Agachamento Livre em isometria', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/UuNZ7xD4j6Hyfv5MxtNa.png', sets: '3', reps: '20', carga: '0', obs: 'Método Simples (20 RM)', recovery: '30s' },
            { name: 'Agachamento sumô com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/ppcH4fGDEECXlMqXrCE6.png', sets: '4', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Stiff em pé com HBM', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3K80Z1TYwuZVPzJGl6hF.png', sets: '4', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Extensão de quadril com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/sSegYH7wUf0Xq08nCzxJ.png', sets: '4', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Remada aberta na máquina (ou aberta sentada pulley baixo)', img: '', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Crucifixo inverso com HBC (ou curvada com HBC)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/74otdJGwmHzhduMk2bkb.png', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' },
            { name: 'Bíceps em pé no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/Ee9RkUYguPhJsylsOOr2.avif', sets: '3', reps: '10', carga: '0', obs: 'Método Simples (10 RM)', recovery: '30s' }
        ],
        'andrademarcia.ucam@gmail.com': [
            { name: 'Extensão de quadril em pé (caneleira) ou máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/3ozI0U0TzKEwRNqcxiv4.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Remada aberta sentada em máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/4CM6u1EOI3c0Srnpcly8.avif', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira abdutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/6tnHeV7VNw7bQClFlJTv.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/CHmXKHcPr070Vm3F1x2Z.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/iLHTNGWVYUEGS4hbvQNe.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Equilíbrio unilateral em pé em isometria (braços abertos e 1 quadril fletido)', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/XRTBWuqR3iUTXseGoetD.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 segundos)', recovery: '30s' }
        ],
        'lilicatorres@gmail.com': [
            { name: 'Extensão de quadril em pé com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/u3PKU8ZtUUSdtG0c9g6A.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Remada aberta no cross com barra reta polia média', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/hGUY7h8KaJpKuH1m21qJ.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira abdutora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/PQBZvn960IwgHLNHT2eL.webp', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pulley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/rr9P7XL3R0cPkWpEebgY.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/UDZmcm25RwYOhocskktS.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 RM)', recovery: '30s' },
            { name: 'Mata-borrão isométrico no solo em isometria', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/JjtFkVUdIjopuD5v28Hp.png', sets: '3', reps: '15', carga: '0', obs: 'Método Simples (15 segundos)', recovery: '30s' }
        ],
        'arbrito.andrade@gmail.com': [
            { name: 'Agachamento sumô com HBC', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/mMHN6y1mlWxmdkXOQEBR.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Extensão de quadril em pé com caneleira', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/8HuxnupHOQqGroglEBHX.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Cadeira flexora', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/YGHeKmY7PkCkLGIiuXA5.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Remada aberta na máquina', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/FGxqWChzRgUfZRA55VcS.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Puxada aberta no pullley alto', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/FWuSz2883Pq7arcJCv0q.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Bíceps no cross barra reta', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/gowjwWfe9PfmcVVHB8Jv.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (12 RM)', recovery: '30s' },
            { name: 'Mata-borrão isométrico no solo em isometria', img: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WsTwhcQeE99iAkUHmCmn/pub/h8GZDrtzz0gnGnemfDr3.png', sets: '3', reps: '12', carga: '0', obs: 'Método Simples (15 segundos)', recovery: '30s' }
        ]
    };
    
    const userRunningWorkouts = {
        'britodeandrade@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' AQ + 20' CO alternado entre CA : CO + 5' REC", speed: '8,5', pace: '7', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '9,5', pace: '6,19', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' AQ + 3 KM DE CO CONTÍNUA + 5' REC", speed: '8,5', pace: '7,04', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' AQ + (4 BLOCOS) 500 metros CO : 2'30'' REC + 3' REC", speed: '11', pace: '5,27', duration: '26,3' },
            { date: '2024-10-05', type: 'TIROS', description: "5' AQ + (8 TIROS) 200 metros CO : 2'30 REC + 3' REC", speed: '15', pace: '4', duration: '32' },
        ],
        'marcellybispo92@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' AQ + 20' CO alternado entre CA : CO + 5' REC", speed: '7,5', pace: '8', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '8,5', pace: '7,04', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' AQ + 3 KM DE CO CONTÍNUA + 5' REC", speed: '8', pace: '7,3', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' AQ + (4 BLOCOS) 500 metros CO : 2'30'' REC + 3' REC", speed: '9,5', pace: '6,19', duration: '26,3' },
            { date: '2024-10-05', type: 'TIROS', description: "5' AQ + (8 TIROS) 200 metros CO : 2'30 REC + 3' REC", speed: '12', pace: '5', duration: '32' },
        ],
        'lilicatorres@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' CA Fraca + 25' CA Forte : CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' CA Fraca + 2 KM DE CA CONTÍNUA + 5' CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' CA Fraca + (4 BLOCOS) 500 metros CA Forte : 2'30'' CA Fraca + 3' Ca Fraca", speed: '6', pace: '10', duration: '30' },
            { date: '2024-10-05', type: 'TIROS', description: "5' CA Fraca + (9 TIROS) 1' CO Confortavel : 2' CA Fraca + 3' REC", speed: '7,5', pace: '8', duration: '30' },
        ],
        'andrademarcia.ucam@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' CA Fraca + 25' CA Forte : CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' CA Fraca + 2 KM DE CA CONTÍNUA + 5' CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' CA Fraca + (4 BLOCOS) 500 metros CA Forte : 2'30'' CA Fraca + 3' Ca Fraca", speed: '6', pace: '10', duration: '30' },
            { date: '2024-10-05', type: 'TIROS', description: "5' CA Fraca + (9 TIROS) 1' CO Confortavel : 2' CA Fraca + 3' REC", speed: '7,5', pace: '8', duration: '30' },
        ],
        'arbrito.andrade@gmail.com': [
            { date: '2024-10-01', type: 'FARTLEK', description: "5' CA Fraca + 25' CA Forte : CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-02', type: 'INTERVALADO', description: "5' AQ + (6 BLOCOS) 2' CO : 1'30'' REC + 3' REC", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-03', type: 'LONGÃO', description: "5' CA Fraca + 2 KM DE CA CONTÍNUA + 5' CA Fraca", speed: '5,5', pace: '11', duration: '30' },
            { date: '2024-10-04', type: 'RITMO', description: "5' CA Fraca + (4 BLOCOS) 500 metros CA Forte : 2'30'' CA Fraca + 3' Ca Fraca", speed: '6', pace: '10', duration: '30' },
            { date: '2024-10-05', type: 'TIROS', description: "5' CA Fraca + (9 TIROS) 1' CO Confortavel : 2' CA Fraca + 3' REC", speed: '7,5', pace: '8', duration: '30' },
        ]
    };
    
    database.trainingPlans = {
        treinosA,
        treinosB,
        periodizacao: periodizacaoPorUsuario
    };

    Object.keys(userRunningWorkouts).forEach(email => {
        userRunningWorkouts[email] = generateCyclicRunningWorkouts(userRunningWorkouts[email]);
    });
    database.userRunningWorkouts = userRunningWorkouts;

    const startDate = '2024-07-29';
    // Inicializa o histórico de carga e check-ins para cada usuário e exercício
    database.users.forEach(user => {
        if (database.trainingPlans.treinosA[user.email]) {
            database.trainingPlans.treinosA[user.email].forEach(ex => {
                ex.startDate = startDate;
                if (!ex.historicoCarga) ex.historicoCarga = [{ data: startDate, carga: ex.carga }];
                if (!ex.checkIns) ex.checkIns = [];
            });
        }
        if (database.trainingPlans.treinosB[user.email]) {
            database.trainingPlans.treinosB[user.email].forEach(ex => {
                ex.startDate = startDate;
                if (!ex.historicoCarga) ex.historicoCarga = [{ data: startDate, carga: ex.carga }];
                if (!ex.checkIns) ex.checkIns = [];
            });
        }
    });

    saveDatabase(database);
    console.log('Banco de dados inicializado e salvo');
}

// Fix: Moved screen transition functions to the global scope to resolve "Cannot find name 'transitionScreen'" error on line 416.
// They were previously defined inside the DOMContentLoaded event listener, making them inaccessible to the globally-scoped `renderStudentProfile` function.
// --- Lógica de Transição de Tela ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => (s as HTMLElement).style.display = 'none');
    const screen = document.getElementById(screenId);
    screen.style.display = 'block';
    screen.classList.add('active');
}

function transitionScreen(fromScreen, toScreen, direction = 'right') {
    if (!fromScreen || !toScreen || fromScreen === toScreen) return;

    const fromRight = direction === 'right' ? 'screen-exit-to-left' : 'screen-exit-to-right';
    const fromLeft = direction === 'right' ? 'screen-enter-from-right' : 'screen-enter-from-left';

    toScreen.style.display = 'block';
    toScreen.classList.add(fromLeft);

    requestAnimationFrame(() => {
        fromScreen.classList.add(fromRight);
        toScreen.classList.remove(fromLeft);
    });

    setTimeout(() => {
        fromScreen.style.display = 'none';
        fromScreen.classList.remove('active', 'screen-exit-to-left', 'screen-exit-to-right');
        toScreen.classList.add('active');
    }, 500);
}


// --- APP LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase();
    feather.replace();

    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');
    const loginScreen = document.getElementById('loginScreen');
    const studentProfileScreen = document.getElementById('studentProfileScreen');

    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            appContainer.classList.remove('hidden');
            const currentUser = getCurrentUser();
            if (currentUser) {
                renderStudentProfile(currentUser);
                showScreen('studentProfileScreen');
            } else {
                showScreen('loginScreen');
            }
        }, 500);
    }, 2000);

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('login-email') as HTMLInputElement;
        const email = emailInput.value;
        const user = database.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        const loginError = document.getElementById('login-error');

        if (user) {
            setCurrentUser(user.email);
            renderStudentProfile(user.email);
            transitionScreen(loginScreen, studentProfileScreen, 'right');
            loginError.textContent = '';
        } else {
            loginError.textContent = 'Email não encontrado.';
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        setCurrentUser('');
        transitionScreen(studentProfileScreen, loginScreen, 'left');
    });

    // --- Navegação ---
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetScreenId = (button as HTMLElement).dataset.target;
            const currentScreen = document.querySelector('.screen.active');
            const targetScreen = document.getElementById(targetScreenId);

            if (currentScreen.id !== targetScreenId) {
                navButtons.forEach(btn => btn.classList.remove('text-red-500', 'text-white'));
                button.classList.add('text-red-500');
                (Array.from(navButtons).filter(b => b !== button) as HTMLElement[]).forEach(b => b.classList.add('text-white'));
                
                if (targetScreenId === 'evolutionScreen') renderEvolutionScreen(getCurrentUser());
                
                transitionScreen(currentScreen, targetScreen);
            }
        });
    });

    const backButtons = document.querySelectorAll('.back-btn');
    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetScreenId = (button as HTMLElement).dataset.target;
            const currentScreen = document.querySelector('.screen.active');
            const targetScreen = document.getElementById(targetScreenId);
            transitionScreen(currentScreen, targetScreen, 'left');
        });
    });

    document.getElementById('running-workouts-list').addEventListener('click', (e) => {
        const email = getCurrentUser();
        if (!email) return;

        const target = e.target as HTMLElement;
        const card = target.closest('.running-session-card') as HTMLElement;
        if (!card) return;

        const workoutDate = card.dataset.workoutDate;

        if ((target as HTMLInputElement).type === 'checkbox') {
            const isChecked = (target as HTMLInputElement).checked;
            handleRunningCheckIn(email, workoutDate, isChecked);
            renderRunningScreen(email); // Refresh running screen to show potential changes
            renderCalendar(email); // Update main profile screen calendar
        } else {
            openRunningLogModal(email, workoutDate);
        }
    });
});

function renderStudentProfile(email) {
    const user = database.users.find(u => u.email === email);
    if (!user) return;

    const userGreeting = document.getElementById('user-greeting');
    const now = new Date();
    const hours = now.getHours();
    let greeting = 'Olá';
    if (hours < 12) greeting = 'Bom dia';
    else if (hours < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';
    userGreeting.innerHTML = `
        <h1 class="text-3xl font-bold text-white">${greeting},</h1>
        <p class="text-2xl text-white">${user.name.split(' ')[0]}</p>
    `;

    const studentProfileInfo = document.getElementById('student-profile-info');
    studentProfileInfo.innerHTML = `
        <img src="${user.photo}" alt="Foto do Aluno" class="w-20 h-20 rounded-full mr-4 border-2 border-red-500">
        <div>
            <h2 class="text-xl font-bold text-white">${user.name}</h2>
            <p class="text-sm text-white">${user.email}</p>
        </div>
    `;

    const studentProfileButtons = document.getElementById('student-profile-buttons');
    studentProfileButtons.innerHTML = `
        <button data-target="aiAnalysisScreen" id="ai-analysis-btn" class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="cpu"></i><span class="text-xs">Análise IA</span></button>
        <button data-target="physioAssessmentScreen" id="physio-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="users"></i><span class="text-xs">Avaliação</span></button>
        <button data-target="runningScreen" id="running-btn" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="wind"></i><span class="text-xs">Corrida</span></button>
        <button data-target="exerciciosScreen" id="exercicios-btn" class="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="book-open"></i><span class="text-xs">Exercícios</span></button>
        <button data-target="iaNutritionistScreen" id="ia-nutritionist-btn" class="bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="heart"></i><span class="text-xs">Nutri IA</span></button>
        <button data-target="outdoorSelectionScreen" class="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="sun"></i><span class="text-xs">Outdoor</span></button>
        <button data-target="periodizationScreen" id="periodization-btn" class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="calendar"></i><span class="text-xs">Periodização</span></button>
        <button data-target="weightControlScreen" id="weight-control-btn" class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="bar-chart-2"></i><span class="text-xs">Peso</span></button>
        <button data-target="trainingScreen" data-training-type="A" class="training-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="clipboard"></i><span class="text-xs">Treino A</span></button>
        <button data-target="trainingScreen" data-training-type="B" class="training-btn bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition text-center"><i data-feather="clipboard"></i><span class="text-xs">Treino B</span></button>
    `;
    feather.replace();

    studentProfileButtons.addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest('button');
        if (!button) return;

        const targetScreenId = button.dataset.target;
        if (targetScreenId) {
            const currentScreen = document.getElementById('studentProfileScreen');
            const targetScreen = document.getElementById(targetScreenId);
            const trainingType = button.dataset.trainingType;

            if (targetScreenId === 'trainingScreen' && trainingType) {
                renderTrainingScreen(email, trainingType);
            } else if (targetScreenId === 'periodizationScreen') {
                renderPeriodizationScreen(email);
            } else if (targetScreenId === 'runningScreen') {
                renderRunningScreen(email);
            } else if (targetScreenId === 'weightControlScreen') {
                renderWeightControlScreen(email);
            } else if (targetScreenId === 'iaNutritionistScreen') {
                renderNutritionistScreen(email);
            } else if (targetScreenId === 'physioAssessmentScreen') {
                initializePhysioAssessmentScreen();
            } else if (targetScreenId === 'outdoorSelectionScreen') {
                initializeOutdoorSelectionScreen();
            } else if (targetScreenId === 'exerciciosScreen') {
                renderExerciciosScreen();
            }

            transitionScreen(currentScreen, targetScreen);
        }
    });

    renderCalendar(email);
    updateWeather();
}

let calendarDate = new Date();

function renderCalendar(email) {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearEl = document.getElementById('calendar-month-year');
    calendarGrid.innerHTML = '';

    const today = new Date();
    const month = calendarDate.getMonth();
    const year = calendarDate.getFullYear();

    monthYearEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' }).toUpperCase()} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarGrid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    const userRunningWorkouts = database.userRunningWorkouts[email] || [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        let classes = 'calendar-day';
        let workoutType = '';

        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) { // Segunda, Quarta e Sexta
            classes += ' treino-A';
            workoutType = 'A';
        } else if (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6) { // Terça, Quinta e Sábado
            classes += ' treino-B';
            workoutType = 'B';
        }

        const runningWorkout = userRunningWorkouts.find(w => {
            const workoutDate = new Date(w.date);
            return workoutDate.getUTCDate() === day && workoutDate.getUTCMonth() === month && workoutDate.getUTCFullYear() === year;
        });

        if (runningWorkout) {
             classes += runningWorkout.completed ? ' treino-corrida-completed' : ' treino-corrida';
        }
        
        if (date.toDateString() === today.toDateString()) {
            classes += ' today';
        }

        calendarGrid.innerHTML += `<div class="${classes}" data-day="${day}" data-workout="${workoutType}">${day}</div>`;
    }
}

document.getElementById('prev-month-btn').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar(getCurrentUser());
});
document.getElementById('next-month-btn').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar(getCurrentUser());
});

// --- TELA BIBLIOTECA DE EXERCÍCIOS ---
function getAllExercises() {
    const uniqueExercises = new Map();
    const { treinosA, treinosB } = database.trainingPlans;

    const addExercisesFromPlan = (plan) => {
        Object.values(plan).forEach((userExercises: any[]) => {
            userExercises.forEach(ex => {
                if (!uniqueExercises.has(ex.name)) {
                    uniqueExercises.set(ex.name, ex);
                }
            });
        });
    };

    addExercisesFromPlan(treinosA);
    addExercisesFromPlan(treinosB);

    const allExercises = Array.from(uniqueExercises.values());
    allExercises.sort((a, b) => a.name.localeCompare(b.name));
    return allExercises;
}

function renderExerciciosScreen() {
    const allExercises = getAllExercises();
    const listEl = document.getElementById('exercise-library-list');
    const searchInput = document.getElementById('exercise-search-input') as HTMLInputElement;

    searchInput.value = ''; // Limpa busca ao renderizar a tela

    const displayExercises = (exercisesToDisplay) => {
        listEl.innerHTML = '';
        if (exercisesToDisplay.length === 0) {
            listEl.innerHTML = `<p class="col-span-2 text-center text-white">Nenhum exercício encontrado.</p>`;
            return;
        }
        exercisesToDisplay.forEach(ex => {
            const cardHtml = `
                <div class="exercise-library-card">
                    <img src="${ex.img || 'https://via.placeholder.com/100x100/4b5563/FFFFFF?text=SEM+IMG'}" alt="${ex.name}">
                    <h3>${ex.name}</h3>
                </div>
            `;
            listEl.innerHTML += cardHtml;
        });
    };

    displayExercises(allExercises);

    const handleSearch = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredExercises = allExercises.filter(ex => 
            ex.name.toLowerCase().includes(searchTerm)
        );
        displayExercises(filteredExercises);
    };
    
    searchInput.removeEventListener('input', handleSearch);
    searchInput.addEventListener('input', handleSearch);
}

function getCurrentTrainingWeek(email) {
    const treinosA = database.trainingPlans.treinosA[email] || [];
    const treinosB = database.trainingPlans.treinosB[email] || [];

    const allCheckIns = new Set<string>();
    treinosA.forEach(ex => ex.checkIns?.forEach(date => allCheckIns.add(date)));
    treinosB.forEach(ex => ex.checkIns?.forEach(date => allCheckIns.add(date)));

    const uniqueCheckinDays = allCheckIns.size;
    // Assuming a structure of A, B, A, B per week, which means 4 workout sessions per week.
    const workoutsPerWeek = 4;

    const completedWeeks = Math.floor(uniqueCheckinDays / workoutsPerWeek);
    const currentWeek = completedWeeks + 1;
    
    return currentWeek;
}

function processExercises(exercises, email) {
    if (!exercises || exercises.length === 0) return [];

    const currentWeek = getCurrentTrainingWeek(email);
    const periodizacao = database.trainingPlans.periodizacao[email];

    if (!periodizacao) {
        return exercises.map((ex, index) => ({ ...ex, name: `${index + 1}. ${ex.name}` }));
    }

    let currentPhase = periodizacao[periodizacao.length - 1]; // Default to last phase

    for (let i = 0; i < periodizacao.length; i++) {
        const weekRange = periodizacao[i].week.match(/\d+/g);
        if (!weekRange) continue;
        const startWeek = parseInt(weekRange[0], 10);
        const endWeek = weekRange[1] ? parseInt(weekRange[1], 10) : startWeek;
        if (currentWeek >= startWeek && currentWeek <= endWeek) {
            currentPhase = periodizacao[i];
            break;
        }
    }

    return exercises.map((ex, index) => {
        return {
            ...ex,
            name: `${index + 1}. ${ex.name}`,
            reps: currentPhase.reps,
            recovery: currentPhase.recovery,
            method: currentPhase.methods
        };
    });
}


function renderTrainingScreen(email, trainingType) {
    const titleEl = document.getElementById('training-title');
    const contentWrapper = document.getElementById('training-content-wrapper');
    contentWrapper.innerHTML = '';

    const treinos = trainingType === 'A' ? database.trainingPlans.treinosA[email] : database.trainingPlans.treinosB[email];
    const processedExercises = processExercises(treinos, email);
    
    titleEl.textContent = `Treino ${trainingType}`;

    processedExercises.forEach(ex => {
        const today = new Date().toISOString().split('T')[0];
        const isChecked = ex.checkIns && ex.checkIns.includes(today);
        const originalName = ex.name.substring(ex.name.indexOf(' ') + 1);
        const cardHtml = `
            <div class="exercise-card bg-gray-800 p-3 rounded-xl border border-gray-700 flex items-center gap-3" data-exercise-name="${originalName}" data-training-type="${trainingType}">
                <img src="${ex.img || 'https://via.placeholder.com/100x100/4b5563/FFFFFF?text=SEM+IMG'}" alt="thumbnail" class="exercise-thumbnail">
                <div class="flex-grow">
                    <h3 class="font-bold text-md">${ex.name}</h3>
                    <p class="text-sm">Séries: ${ex.sets} | Reps: ${ex.reps} | Rec: ${ex.recovery}</p>
                </div>
                <input type="checkbox" class="exercise-checkbox flex-shrink-0 w-6 h-6 rounded-md border-2 border-gray-600 bg-gray-700 focus:ring-0" ${isChecked ? 'checked' : ''}>
            </div>
        `;
        contentWrapper.innerHTML += cardHtml;
    });
   
    contentWrapper.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const card = target.closest('.exercise-card') as HTMLElement;
        if (!card) return;

        const exerciseName = card.dataset.exerciseName;
        const currentTrainingType = card.dataset.trainingType;

        if ((target as HTMLInputElement).type === 'checkbox') {
            handleExerciseCheckIn(email, currentTrainingType, exerciseName, (target as HTMLInputElement).checked);
        } else {
             if (currentTrainingType === 'A' || currentTrainingType === 'B') {
                openExerciseModal(email, currentTrainingType, exerciseName);
            }
        }
    });
}

function handleExerciseCheckIn(email, trainingType, exerciseName, isChecked) {
    let exercise;
    if (trainingType === 'A') {
        exercise = database.trainingPlans.treinosA[email].find(ex => ex.name === exerciseName);
    } else if (trainingType === 'B') {
        exercise = database.trainingPlans.treinosB[email].find(ex => ex.name === exerciseName);
    }
    
    if (exercise) {
        if (!exercise.checkIns) exercise.checkIns = [];
        const today = new Date().toISOString().split('T')[0];
        const index = exercise.checkIns.indexOf(today);
        if (isChecked && index === -1) {
            exercise.checkIns.push(today);
        } else if (!isChecked && index > -1) {
            exercise.checkIns.splice(index, 1);
        }
        saveDatabase(database);
        console.log(`Check-in for ${exerciseName} updated.`);
    }
}


function openExerciseModal(email, trainingType, exerciseName) {
    const treinos = trainingType === 'A' ? database.trainingPlans.treinosA[email] : database.trainingPlans.treinosB[email];
    const exercise = treinos.find(ex => ex.name === exerciseName);
    if (!exercise) {
        console.error('Exercício não encontrado:', exerciseName);
        return;
    }

    const processedExercise = processExercises([exercise], email)[0];
    const modal = document.getElementById('exerciseDetailModal');
    const modalContent = document.getElementById('exercise-modal-content');
    
    document.getElementById('modal-exercise-img').setAttribute('src', exercise.img || 'https://via.placeholder.com/400x200/4b5563/FFFFFF?text=SEM+IMAGEM');
    document.getElementById('modal-exercise-name').textContent = processedExercise.name;
    
    const methodContainer = document.getElementById('modal-exercise-method');
    methodContainer.querySelector('p').textContent = processedExercise.method || 'Não especificado';

    const cargaInput = document.getElementById('carga-input') as HTMLInputElement;
    cargaInput.value = exercise.carga || '';

    renderCargaHistory(exercise.historicoCarga);

    const form = document.getElementById('edit-carga-form');
    // Clone and replace the form to remove old event listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newCarga = (document.getElementById('carga-input') as HTMLInputElement).value;
        if (newCarga) {
            exercise.carga = newCarga;
            const today = new Date().toISOString().split('T')[0];
            if (!exercise.historicoCarga) exercise.historicoCarga = [];
            
            // Check if there is already an entry for today and update it, otherwise add new
            const todayEntry = exercise.historicoCarga.find(h => h.data === today);
            if(todayEntry) {
                todayEntry.carga = newCarga;
            } else {
                exercise.historicoCarga.push({ data: today, carga: newCarga });
            }

            saveDatabase(database);
            renderCargaHistory(exercise.historicoCarga);
            closeExerciseModal();
        }
    });

    modal.classList.remove('hidden');
    modalContent.classList.add('scale-100', 'opacity-100');
}

function renderCargaHistory(history) {
    const historyList = document.getElementById('carga-history-list');
    historyList.innerHTML = '';
    if (history && history.length > 0) {
        // Sort history descending by date
        const sortedHistory = [...history].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        sortedHistory.forEach(item => {
            const date = new Date(item.data);
            const formattedDate = `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            historyList.innerHTML += `
                <div class="flex justify-between items-center bg-gray-700 p-2 rounded-md text-sm">
                    <span>${formattedDate}</span>
                    <span class="font-bold">${item.carga} kg</span>
                </div>
            `;
        });
    } else {
        historyList.innerHTML = '<p class="text-center text-sm">Nenhum histórico de carga.</p>';
    }
}

function closeExerciseModal() {
    const modal = document.getElementById('exerciseDetailModal');
    const modalContent = document.getElementById('exercise-modal-content');
    modalContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}
document.getElementById('closeExerciseModalBtn').addEventListener('click', closeExerciseModal);

function renderPeriodizationScreen(email) {
    const contentWrapper = document.getElementById('periodization-content-wrapper');
    contentWrapper.innerHTML = '';
    
    const user = database.users.find(u => u.email === email);
    if (!user) return;
    
    const currentWeekNumber = getCurrentTrainingWeek(email);
    
    const periodizationPlan = database.trainingPlans.periodizacao[email];
    if (!periodizationPlan) {
        contentWrapper.innerHTML = '<p class="text-center text-white">Nenhum plano de periodização encontrado.</p>';
        return;
    }
    
    periodizationPlan.forEach(phase => {
        let isCurrentPhase = false;
        if (currentWeekNumber !== -1) {
            const weekRange = phase.week.match(/\d+/g);
            if (weekRange) {
                const startWeek = parseInt(weekRange[0], 10);
                const endWeek = weekRange[1] ? parseInt(weekRange[1], 10) : startWeek;
                if (currentWeekNumber >= startWeek && currentWeekNumber <= endWeek) {
                    isCurrentPhase = true;
                }
            }
        }

        const cardClasses = isCurrentPhase 
            ? 'bg-yellow-800 border-yellow-500' 
            : 'bg-gray-800 border-gray-700';
            
        let detailsHtml = `
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Repetições:</strong> ${phase.reps}</div>
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Volume:</strong> ${phase.volume}</div>
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Intensidade:</strong> ${phase.intensity}</div>
                <div class="p-3 bg-gray-900/50 rounded-lg"><strong>Recuperação:</strong> ${phase.recovery}</div>
            </div>
        `;

        if (phase.metodo_desc && phase.descricao) {
             detailsHtml += `
                <div class="mt-4 pt-4 border-t border-gray-600">
                    <h4 class="font-bold text-md mb-2">${phase.metodo_desc}</h4>
                    <p class="text-sm">${phase.descricao}</p>
                </div>
             `;
        }

        const cardHtml = `
            <div class="p-4 rounded-xl border ${cardClasses}">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <p class="text-xs uppercase tracking-wider">${phase.week}</p>
                        <h3 class="text-xl font-bold">${phase.phase}</h3>
                    </div>
                    ${isCurrentPhase ? '<span class="text-xs font-bold py-1 px-3 bg-yellow-500 text-black rounded-full">FASE ATUAL</span>' : ''}
                </div>
                <p class="mb-3 text-sm"><strong>Métodos:</strong> ${phase.methods}</p>
                ${detailsHtml}
            </div>
        `;
        
        contentWrapper.innerHTML += cardHtml;
    });
}

// --- Tela de Corrida ---
function renderRunningScreen(email) {
    const runningWorkoutsList = document.getElementById('running-workouts-list');
    runningWorkoutsList.innerHTML = '';
    const workouts = database.userRunningWorkouts[email] || [];

    if (workouts.length === 0) {
        runningWorkoutsList.innerHTML = '<p class="text-center text-sm p-4">Nenhum treino de corrida agendado.</p>';
        return;
    }

    workouts.forEach(workout => {
        const workoutDate = new Date(workout.date);
        const formattedDate = `${workoutDate.getUTCDate().toString().padStart(2, '0')}/${(workoutDate.getUTCMonth() + 1).toString().padStart(2, '0')}`;
        const isChecked = workout.completed;

        const cardHtml = `
            <div class="running-session-card bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-start gap-3" data-workout-date="${workout.date}">
                <input type="checkbox" class="exercise-checkbox flex-shrink-0 w-6 h-6 rounded-md border-2 border-gray-600 bg-gray-700 focus:ring-0 mt-1" ${isChecked ? 'checked' : ''}>
                <div class="flex-grow">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-sm">${formattedDate}</span>
                        <span class="running-title-${workout.type.toLowerCase()} text-xs font-bold py-1 px-2 rounded-full">${workout.type}</span>
                    </div>
                    <p class="text-sm mb-3 whitespace-pre-line">${workout.description}</p>
                    <div class="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-gray-700">
                        <div>
                            <span class="font-semibold opacity-80">Velocidade</span>
                            <p class="font-bold text-base">${workout.performance ? workout.performance.avgSpeed.toFixed(1) : workout.speed} km/h</p>
                        </div>
                        <div>
                            <span class="font-semibold opacity-80">Pace</span>
                            <p class="font-bold text-base">${workout.performance ? workout.performance.avgPace : workout.pace} /km</p>
                        </div>
                        <div>
                            <span class="font-semibold opacity-80">Duração</span>
                            <p class="font-bold text-base">${workout.performance ? workout.performance.time : workout.duration} min</p>
                        </div>
                    </div>
                    ${workout.performance ? `
                    <div class="text-center text-xs pt-3 mt-3 border-t border-gray-700">
                        <span class="font-semibold opacity-80">Calorias Queimadas</span>
                        <p class="font-bold text-base">${workout.performance.calories} kcal</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        runningWorkoutsList.innerHTML += cardHtml;
    });
}

function handleRunningCheckIn(email, workoutDate, isChecked) {
    const workout = database.userRunningWorkouts[email]?.find(w => w.date === workoutDate);
    if (workout) {
        workout.completed = isChecked;
        saveDatabase(database);
    }
}

function openRunningLogModal(email, workoutDate) {
    const workout = database.userRunningWorkouts[email]?.find(w => w.date === workoutDate);
    if (!workout) return;

    const modal = document.getElementById('runningLogModal');
    const modalContent = document.getElementById('running-log-modal-content');
    const dateEl = document.getElementById('running-log-date');
    const distanceInput = document.getElementById('running-distance') as HTMLInputElement;
    const timeInput = document.getElementById('running-time') as HTMLInputElement;
    
    const summaryPace = document.getElementById('summary-pace');
    const summarySpeed = document.getElementById('summary-speed');
    const summaryCalories = document.getElementById('summary-calories');

    const workoutDateObj = new Date(workout.date);
    dateEl.textContent = `Treino de ${workoutDateObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;

    if (workout.performance) {
        distanceInput.value = workout.performance.distance || '';
        timeInput.value = workout.performance.time || '';
        summaryPace.textContent = workout.performance.avgPace || '--:--';
        summarySpeed.textContent = workout.performance.avgSpeed?.toFixed(1) || '0.0';
        summaryCalories.textContent = workout.performance.calories || '0';
    } else {
        distanceInput.value = '';
        timeInput.value = '';
        summaryPace.textContent = '--:--';
        summarySpeed.textContent = '0.0';
        summaryCalories.textContent = '0';
    }

    const form = document.getElementById('running-log-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const distance = parseFloat((document.getElementById('running-distance') as HTMLInputElement).value.replace(',', '.'));
        const time = parseFloat((document.getElementById('running-time') as HTMLInputElement).value.replace(',', '.'));
        
        if (!isNaN(distance) && !isNaN(time) && distance > 0 && time > 0) {
            const speed = distance / (time / 60);
            const paceDecimal = time / distance;
            const paceMinutes = Math.floor(paceDecimal);
            const paceSeconds = Math.round((paceDecimal - paceMinutes) * 60);
            const pace = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;

            const user = database.users.find(u => u.email === email);
            // Use the last recorded weight, or a default of 70kg if no history exists.
            let userWeight = 70; // Default weight in kg
            if (user && user.weightHistory && user.weightHistory.length > 0) {
                userWeight = user.weightHistory[user.weightHistory.length - 1].weight;
            }
    
            // Calorie estimation formula: distance (km) * weight (kg) * METs multiplier (approx. 1.036 for running)
            const calories = Math.round(distance * userWeight * 1.036);
            
            workout.performance = {
                distance: distance,
                time: time,
                avgPace: pace,
                avgSpeed: speed,
                calories: calories
            };
            workout.completed = true;
            saveDatabase(database);
            
            summaryPace.textContent = pace;
            summarySpeed.textContent = speed.toFixed(1);
            summaryCalories.textContent = calories.toString();
            
            closeRunningLogModal();
            renderRunningScreen(email); 
            renderCalendar(email);
        } else {
            alert('Por favor, insira valores numéricos válidos e positivos para distância e tempo.');
        }
    });

    modal.classList.remove('hidden');
    modalContent.classList.add('scale-100', 'opacity-100');
    feather.replace();
}

function closeRunningLogModal() {
    const modal = document.getElementById('runningLogModal');
    const modalContent = document.getElementById('running-log-modal-content');
    modalContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}
document.getElementById('closeRunningLogModalBtn').addEventListener('click', closeRunningLogModal);


// --- Tela de Evolução ---
let treinoAChart = null;
let treinoBChart = null;
function renderEvolutionScreen(email) {
    const selectA = document.getElementById('select-treino-a') as HTMLSelectElement;
    const selectB = document.getElementById('select-treino-b') as HTMLSelectElement;
    
    selectA.innerHTML = database.trainingPlans.treinosA[email].map((ex, index) => `<option value="${index}">${processExercises([ex], email)[0].name}</option>`).join('');
    selectB.innerHTML = database.trainingPlans.treinosB[email].map((ex, index) => `<option value="${index}">${processExercises([ex], email)[0].name}</option>`).join('');
    
    selectA.onchange = () => updateChart('A', email);
    selectB.onchange = () => updateChart('B', email);

    updateChart('A', email);
    updateChart('B', email);
}

function updateChart(type, email) {
    const select = document.getElementById(`select-treino-${type.toLowerCase()}`) as HTMLSelectElement;
    const exerciseIndex = parseInt(select.value);
    const exercises = type === 'A' ? database.trainingPlans.treinosA[email] : database.trainingPlans.treinosB[email];
    const exercise = exercises[exerciseIndex];

    const chartCanvas = document.getElementById(`treino${type}Chart`) as HTMLCanvasElement;
    let chartInstance = type === 'A' ? treinoAChart : treinoBChart;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const data = exercise.historicoCarga ? exercise.historicoCarga.map(h => ({ x: h.data, y: parseFloat(h.carga) })) : [];
    
    // Sort data by date
    data.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    const ctx = chartCanvas.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Carga (kg)',
                data: data,
                borderColor: type === 'A' ? '#3b82f6' : '#10b981',
                backgroundColor: type === 'A' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'dd/MM/yyyy'
                    },
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });

    if (type === 'A') {
        treinoAChart = chartInstance;
    } else {
        treinoBChart = chartInstance;
    }
}

// --- Tela de Controle de Peso ---
let weightChart = null;

function renderWeightControlScreen(email) {
    const user = database.users.find(u => u.email === email);
    if (!user.weightHistory) user.weightHistory = [];

    renderWeightChart(user.weightHistory);
    renderWeightHistoryList(user.weightHistory);

    const saveWeightBtn = document.getElementById('save-weight-btn');
    const weightInput = document.getElementById('weight-input') as HTMLInputElement;

    saveWeightBtn.onclick = () => {
        const newWeight = parseFloat(weightInput.value);
        if (newWeight > 0) {
            const today = new Date().toISOString().split('T')[0];
            
            const todayEntryIndex = user.weightHistory.findIndex(h => h.date === today);
            if(todayEntryIndex > -1) {
                user.weightHistory[todayEntryIndex].weight = newWeight;
            } else {
                 user.weightHistory.push({ date: today, weight: newWeight });
            }
           
            saveDatabase(database);
            renderWeightChart(user.weightHistory);
            renderWeightHistoryList(user.weightHistory);
            weightInput.value = '';
        }
    };
}

function renderWeightChart(history) {
    if (weightChart) {
        weightChart.destroy();
    }
    const ctx = (document.getElementById('weightChart') as HTMLCanvasElement).getContext('2d');
    const data = history.map(h => ({ x: h.date, y: h.weight })).sort((a,b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Peso (kg)',
                data: data,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy' },
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: { legend: { labels: { color: 'white' } } }
        }
    });
}

function renderWeightHistoryList(history) {
    const listEl = document.getElementById('weight-history-list');
    listEl.innerHTML = '';
    if (!history || history.length === 0) {
        listEl.innerHTML = '<p class="text-center text-sm">Nenhum registro de peso.</p>';
        return;
    }
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sortedHistory.forEach(item => {
        const date = new Date(item.date);
        const formattedDate = `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        listEl.innerHTML += `
            <div class="flex justify-between items-center bg-gray-700 p-2 rounded-md text-sm">
                <span>${formattedDate}</span>
                <span class="font-bold">${item.weight.toFixed(1)} kg</span>
            </div>
        `;
    });
}

// --- Weather Widget ---
async function updateWeather() {
    const widget = document.getElementById('weather-widget');
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo');
        const data = await response.json();
        const weatherCode = data.current.weather_code;
        const temp = Math.round(data.current.temperature_2m);
        const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
        const minTemp = Math.round(data.daily.temperature_2m_min[0]);
        
        const weatherIcons = {
            0: 'sun', 1: 'sun', 2: 'cloud', 3: 'cloud',
            45: 'cloud', 48: 'cloud', 51: 'cloud-drizzle', 53: 'cloud-drizzle', 55: 'cloud-drizzle',
            61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-rain',
            80: 'cloud-rain', 81: 'cloud-rain', 82: 'cloud-rain',
            95: 'cloud-lightning', 96: 'cloud-lightning', 99: 'cloud-lightning'
        };

        const icon = weatherIcons[weatherCode] || 'sun';
        
        widget.innerHTML = `
            <div class="flex items-center justify-end">
                <i data-feather="${icon}" class="w-5 h-5 text-white mr-2"></i>
                <span class="text-xl font-bold text-white">${temp}°C</span>
            </div>
            <div class="text-xs text-white text-right">
                <span>Max: ${maxTemp}°</span> / <span>Min: ${minTemp}°</span>
            </div>
        `;
        feather.replace();
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        widget.innerHTML = '<span class="text-xs">Clima indisponível</span>';
    }
}
// Placeholder functions for screens not yet implemented in detail
function renderAiAnalysisScreen(email) { console.log("Rendering AI Analysis for", email); }
function renderNutritionistScreen(email) { console.log("Rendering Nutritionist for", email); }
function initializePhysioAssessmentScreen() { console.log("Initializing Physio Assessment"); }
function initializeOutdoorSelectionScreen() { console.log("Initializing Outdoor Selection"); }