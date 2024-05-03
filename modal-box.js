const elementGpgp = document.getElementById('gpgp-modal');

mw.loader.using( '@wikimedia/codex' ).then( function( require ) {
	const Vue = require( 'vue' );
	const Codex = require( '@wikimedia/codex' );
	const mountPoint = elementGpgp.appendChild( document.createElement( 'div' ) );
	
	Vue.createMwApp( {
		data: function() {
			return {
				showDialog: false,
				searchQuery: ''
			};
		},
		template: `
<cdx-button action="progressive" weight="primary">Criar Grupo de Pesquisa</cdx-button>
<cdx-dialog v-model:open="showDialog" title="Criar Grupo de Pesquisa" close-button-label="Close" :default-action="defaultAction" @default="open = false">
	<p>Digite o título do Grupo de Pesquisa:</p>
	<cdx-text-input v-model="inputValue" aria-label="TextInput default demo"></cdx-text-input>

	<p>Insira uma descrição:</p>
	<cdx-text-area v-model="textareaValue" aria-label="TextArea default demo"></cdx-text-area>

	<p>Cor para o layout no formato #FFFFFF (opcional):</p>
	<cdx-text-input v-model="inputValue" aria-label="TextInput default demo"></cdx-text-input>

	<cdx-field>
		<template #label>
			Pesquisadores
		</template>
		<template #description>
			Encontre o pesquisador no Wikidata
		</template>
		<template #help-text>
			Se o pesquisador não tiver um item no Wikidata insira o nome dele no campo acima
		</template>
		
		<cdx-lookup
			v-model:selected="selection"
			:menu-items="menuItems"
			:menu-config="menuConfig"
			@input="onInput"
			@load-more="onLoadMore"
			@update:selected="insertSelectedInChipInput"
		>
			<template #no-results>
				Nenhum resultado encontrado.
			</template>
		</cdx-lookup>
		
		<cdx-chip-input
		v-model:input-chips="exampleChips"
		remove-button-label="Remove"
		separateInput="true"
		></cdx-chip-input>
		
	</cdx-field>

	<p>Digite um resumo da edição:</p>
	<cdx-text-input v-model="inputValue" aria-label="TextInput default demo"></cdx-text-input>

	<cdx-button action="progressive">Progressive button</cdx-button>
</cdx-dialog>
		`,
		methods: {
			openDialog () {
				this.showDialog = true;
			}
		},
		setup() {
		const selection = ref( null );
		const menuItems = ref( [] );
		const currentSearchTerm = ref( '' );
		const exampleChips = ref( [] );
		const menuConfig = {
			visibleItemLimit: 6
		};

		function ref(value){
				return Vue.ref(value);
		}
		
		function insertSelectedInChipInput(){
			// selected value has a QID
			if(selection.value !== null){
				
				// iterates over suggested items to find the selected item
				for (let item of menuItems.value) {
					if(item.value == selection.value){
						
						// manipulates chipInput values
						// var payload = '<a href="https://www.wikidata.org/wiki/' + item.value + '" target="_blank">' + item.label + ' (' + item.value + ')</a>';
						var payload = item.label + " (" + item.value + ")";
						var payloadInChips = false;
						var chips = exampleChips.value;
						for (let chip of chips){
							if(payload == chip.value){
								payloadInChips = true;
								break;
							}
						}
						if (payloadInChips == false) {
							chips.push({value: payload});
							return;
						}
					}
				}
			}
		}

		/**
		 * Get search results.
		 *
		 * @param {string} searchTerm
		 * @param {number} offset Optional result offset
		 *
		 * @return {Promise}
		 */
		function fetchResults( searchTerm, offset ) {
			const params = new URLSearchParams( {
				origin: '*',
				action: 'wbsearchentities',
				format: 'json',
				limit: '10',
				props: 'url',
				language: 'en',
				search: searchTerm
			} );
			if ( offset ) {
				params.set( 'continue', String( offset ) );
			}
			return fetch( `https://www.wikidata.org/w/api.php?${ params.toString() }` )
				.then( ( response ) => response.json() );
		}

		/**
		 * Handle lookup input.
		 *
		 * TODO: this should be debounced.
		 *
		 * @param {string} value
		 */
		function onInput( value ) {
			// Internally track the current search term.
			currentSearchTerm.value = value;

			// Do nothing if we have no input.
			if ( !value ) {
				menuItems.value = [];
				return;
			}

			fetchResults( value )
				.then( ( data ) => {
					// Make sure this data is still relevant first.
					if ( currentSearchTerm.value !== value ) {
						return;
					}

					// Reset the menu items if there are no results.
					if ( !data.search || data.search.length === 0 ) {
						menuItems.value = [];
						return;
					}

					// Build an array of menu items.
					const results = data.search.map( ( result ) => {
						return {
							label: result.label,
							value: result.id,
							description: result.description
						};
					} );

					// Update menuItems.
					menuItems.value = results;
				} )
				.catch( () => {
					// On error, set results to empty.
					menuItems.value = [];
				} );
		}

		function deduplicateResults( results ) {
			const seen = new Set( menuItems.value.map( ( result ) => result.value ) );
			return results.filter( ( result ) => !seen.has( result.value ) );
		}

		function onLoadMore() {
			if ( !currentSearchTerm.value ) {
				return;
			}

			fetchResults( currentSearchTerm.value, menuItems.value.length )
				.then( ( data ) => {
					if ( !data.search || data.search.length === 0 ) {
						return;
					}

					const results = data.search.map( ( result ) => {
						return {
							label: result.label,
							value: result.id,
							description: result.description
						};
					} );

					// Update menuItems.
					const deduplicatedResults = deduplicateResults( results );
					menuItems.value.push( ...deduplicatedResults );
				} );
		}

		return {
			selection,
			menuItems,
			menuConfig,
			onInput,
			onLoadMore,
			exampleChips,
			insertSelectedInChipInput
		};
	},
		mounted() {
			elementGpgp.addEventListener( 'click', this.openDialog );
		},
		unMounted() {
			elementGpgp.removeEventListener( this.openDialog );
		}
	} )
	.component( 'cdx-dialog', Codex.CdxDialog )
	.component( 'cdx-text-input', Codex.CdxTextInput )
	.component( 'cdx-text-area', Codex.CdxTextArea )
	.component( 'cdx-button', Codex.CdxButton )
	.component( 'cdx-lookup', Codex.CdxLookup )
	.component( 'cdx-field', Codex.CdxField )
	.component( 'cdx-chip-input', Codex.CdxChipInput )
	.mount( mountPoint );
} );
