/**
 * ポケモン図鑑アプリケーション
 * 第二世代までのポケモンを表示するポケデックスインターフェース
 */

// 定数
const MAX_POKEMON = 251; // 第二世代までのポケモン数
const POKEMON_API_URL = 'https://pokeapi.co/api/v2/pokemon';
const SPECIES_API_URL = 'https://pokeapi.co/api/v2/pokemon-species';
const ANIMATED_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated';

// DOM要素
const pokemonListElement = document.getElementById('pokemon-list');
const pokemonSpriteElement = document.getElementById('pokemon-sprite');
const pokemonNameElement = document.getElementById('pokemon-name');
const pokemonNumberElement = document.getElementById('pokemon-number');
const pokemonTypesElement = document.getElementById('pokemon-types');
const pokemonSearchElement = document.getElementById('pokemon-search');

// ポケモンデータのキャッシュ
const pokemonCache = {};

// タイプの日本語名マッピング
const typeTranslations = {
    normal: 'ノーマル',
    fire: 'ほのお',
    water: 'みず',
    electric: 'でんき',
    grass: 'くさ',
    ice: 'こおり',
    fighting: '格闘',
    poison: 'どく',
    ground: 'じめん',
    flying: 'ひこう',
    psychic: 'エスパー',
    bug: 'むし',
    rock: 'いわ',
    ghost: 'ゴースト',
    dragon: 'ドラゴン',
    dark: 'あく',
    steel: 'はがね',
    fairy: 'フェアリー'
};

/**
 * アプリケーションの初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    initializePokemonList();
    setupSearchFunctionality();
});

/**
 * ポケモンリストの初期化
 */
async function initializePokemonList() {
    // ロード中メッセージを表示
    pokemonListElement.innerHTML = '<div class="loading">ポケモンデータをロード中...</div>';
    
    try {
        // 全ポケモンの基本データを取得
        const pokemonList = await fetchAllPokemon();
        
        // リストを表示
        displayPokemonList(pokemonList);
        
        // 最初のポケモンを選択
        if (pokemonList.length > 0) {
            selectPokemon(pokemonList[0].id);
        }
    } catch (error) {
        console.error('ポケモンデータの取得に失敗しました:', error);
        pokemonListElement.innerHTML = '<div class="error">データの読み込みに失敗しました。</div>';
    }
}

/**
 * 検索機能のセットアップ
 */
function setupSearchFunctionality() {
    pokemonSearchElement.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterPokemonList(searchTerm);
    });
}

/**
 * 検索条件に基づいてポケモンリストをフィルタリング
 * @param {string} searchTerm - 検索語
 */
function filterPokemonList(searchTerm) {
    const listItems = pokemonListElement.querySelectorAll('.pokemon-list-item');
    
    listItems.forEach(item => {
        const name = item.querySelector('.pokemon-list-item-name').textContent.toLowerCase();
        const number = item.querySelector('.pokemon-list-item-number').textContent;
        
        if (name.includes(searchTerm) || number.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * 全ポケモンデータを取得
 * @returns {Promise<Array>} ポケモンデータの配列
 */
async function fetchAllPokemon() {
    const pokemonList = [];
    
    // すべてのポケモンデータをフェッチ
    const fetchPromises = [];
    
    for (let i = 1; i <= MAX_POKEMON; i++) {
        fetchPromises.push(fetchPokemonSpecies(i));
    }
    
    // 並列にリクエストを実行
    const results = await Promise.allSettled(fetchPromises);
    
    // 成功したリクエストのみを処理
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            pokemonList.push(result.value);
        }
    });
    
    // ID順に並び替え
    return pokemonList.sort((a, b) => a.id - b.id);
}

/**
 * ポケモン種族データを取得
 * @param {number} id - ポケモンID
 * @returns {Promise<Object>} ポケモン基本データ
 */
async function fetchPokemonSpecies(id) {
    try {
        const response = await fetch(`${SPECIES_API_URL}/${id}`);
        const speciesData = await response.json();
        
        // 日本語の名前を取得
        const jaName = speciesData.names.find(name => name.language.name === 'ja')?.name || speciesData.name;
        
        return {
            id: speciesData.id,
            name: jaName,
            species: speciesData
        };
    } catch (error) {
        console.error(`ポケモン #${id} のデータ取得に失敗:`, error);
        return null;
    }
}

/**
 * ポケモンの詳細データを取得
 * @param {number} id - ポケモンID
 * @returns {Promise<Object>} ポケモン詳細データ
 */
async function fetchPokemonDetails(id) {
    // キャッシュをチェック
    if (pokemonCache[id]) {
        return pokemonCache[id];
    }
    
    try {
        const response = await fetch(`${POKEMON_API_URL}/${id}`);
        const pokemonData = await response.json();
        
        // 種族データを取得
        const speciesResponse = await fetch(pokemonData.species.url);
        const speciesData = await speciesResponse.json();
        
        // 日本語の名前を取得
        const jaName = speciesData.names.find(name => name.language.name === 'ja')?.name || pokemonData.name;
        
        // データを整形
        const pokemon = {
            id: pokemonData.id,
            name: jaName,
            types: pokemonData.types.map(t => t.type.name),
            sprite: `${ANIMATED_SPRITE_URL}/${id}.gif`,
            species: speciesData
        };
        
        // キャッシュに保存
        pokemonCache[id] = pokemon;
        
        return pokemon;
    } catch (error) {
        console.error(`ポケモン #${id} の詳細データ取得に失敗:`, error);
        return null;
    }
}

/**
 * ポケモンリストを表示
 * @param {Array} pokemonList - ポケモンデータの配列
 */
function displayPokemonList(pokemonList) {
    pokemonListElement.innerHTML = '';
    
    pokemonList.forEach(pokemon => {
        const listItem = document.createElement('div');
        listItem.className = 'pokemon-list-item';
        listItem.dataset.id = pokemon.id;
        
        // ミニスプライト画像
        const miniSprite = document.createElement('img');
        miniSprite.className = 'pokemon-mini-sprite';
        // 通常のスプライト画像を使用（アニメーションではない）
        miniSprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        miniSprite.alt = pokemon.name;
        
        // 図鑑番号
        const number = document.createElement('div');
        number.className = 'pokemon-list-item-number';
        number.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
        
        // 名前
        const name = document.createElement('div');
        name.className = 'pokemon-list-item-name';
        name.textContent = pokemon.name;
        
        // リストアイテムに要素を追加
        listItem.appendChild(miniSprite);
        listItem.appendChild(number);
        listItem.appendChild(name);
        
        // クリックイベントを設定
        listItem.addEventListener('click', () => {
            selectPokemon(pokemon.id);
        });
        
        pokemonListElement.appendChild(listItem);
    });
}

/**
 * ポケモンを選択して詳細を表示
 * @param {number} id - ポケモンID
 */
async function selectPokemon(id) {
    try {
        // 詳細データを取得
        const pokemon = await fetchPokemonDetails(id);
        
        if (!pokemon) {
            throw new Error('ポケモンデータが見つかりません');
        }
        
        // 表示を更新
        pokemonSpriteElement.src = pokemon.sprite;
        pokemonSpriteElement.alt = pokemon.name;
        pokemonNameElement.textContent = pokemon.name;
        pokemonNumberElement.textContent = `No. ${String(pokemon.id).padStart(3, '0')}`;
        
        // タイプを表示
        const typesText = pokemon.types
            .map(type => typeTranslations[type] || type)
            .join('、');
        pokemonTypesElement.textContent = `タイプ: ${typesText}`;
        
        // 選択状態をリストに反映
        const listItems = pokemonListElement.querySelectorAll('.pokemon-list-item');
        listItems.forEach(item => {
            if (parseInt(item.dataset.id) === id) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    } catch (error) {
        console.error('ポケモン詳細の表示に失敗:', error);
    }
}
