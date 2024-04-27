// Add a "Codex Widgets" portlet to the main menu
mw.util.addPortlet('p-codex', 'modal-box', '#p-modal');

const dialogTrigger = document.getElementById('p-modal');

mw.loader.using( '@wikimedia/codex' ).then( function( require ) {
	const Vue = require( 'vue' );
	const Codex = require( '@wikimedia/codex' );
	const mountPoint = document.body.appendChild( document.createElement( 'div' ) );
	
	Vue.createMwApp( {
		data: function() {
			return {
				showDialog: false,
				searchQuery: ''
			};
		},
		template: `
<cdx-dialog v-model:open="showDialog" title="Criar Grupo de Pesquisa" close-button-label="Close" :default-action="defaultAction" @default="open = false">
	<p>Digite o título do Grupo de Pesquisa:</p>
	<cdx-text-input v-model="inputValue" aria-label="TextInput default demo"></cdx-text-input>

	<p>Insira uma descrição:</p>
	<cdx-text-area v-model="textareaValue" aria-label="TextArea default demo"></cdx-text-area>

	<p>Cor para o layout no formato #FFFFFF (opcional):</p>
	<cdx-text-input v-model="inputValue" aria-label="TextInput default demo"></cdx-text-input>

	<p>Insira o nome dos pesquisadores separados por ponto e vígula:</p>
	<cdx-typeahead-search id="typeahead-search-wikidata" form-action="https://www.wikidata.org/w/index.php"
		search-results-label="Search results" :search-results="searchResults" :search-footer-url="searchFooterUrl"
		:highlight-query="true" :visible-item-limit="5" placeholder="Search Wikidata" @input="onInput"
		@search-result-click="onSearchResultClick" @submit="onSubmit" @load-more="onLoadMore">
		<template #default>
			<input type="hidden" name="language" value="en">
			<input type="hidden" name="title" value="Special:Search">
		</template>
		<template #search-footer-text="{ searchQuery }">
			Search Wikidata for pages containing
			<strong class="cdx-typeahead-search__search-footer__query">
				{{ searchQuery }}
			</strong>
		</template>
	</cdx-typeahead-search>

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
			function ref(value){
				return Vue.ref(value);
			}
	        const searchResults = ref([]);
	        const searchFooterUrl = ref('');
	        const currentSearchTerm = ref('');
	
	        function fetchResults(searchTerm, offset) {
	            const params = new URLSearchParams({
	                origin: '*',
	                action: 'wbsearchentities',
	                format: 'json',
	                limit: '10',
	                props: 'url',
	                language: 'en',
	                uselang: 'en',
	                type: 'item',
	                search: searchTerm
	            });
	            if (offset) {
	                params.set('continue', `${offset}`);
	            }
	            return fetch(`https://www.wikidata.org/w/api.php?${params.toString()}`)
	                .then((response) => response.json());
	        }
	
	        /**
	         * Format search results for consumption by TypeaheadSearch.
	         *
	         * @param pages
	         * @return
	         */
	        function adaptApiResponse(pages) {
	            return pages.map(({ id, label, url, match, description, display = {} }) => ({
	                value: id,
	                label,
	                match: match.type === 'alias' ? `(${match.text})` : '',
	                description,
	                url,
	                language: {
	                    label: display && display.label && display.label.language,
	                    match: match.type === 'alias' ? match.language : undefined,
	                    description: display && display.description && display.description.language
	                }
	            }));
	        }
	
	        function onInput(value) {
	            // eslint-disable-next-line no-console
	            console.log('input event emitted with value:', value);
	
	            // Internally track the current search term.
	            currentSearchTerm.value = value;
	
	            // Unset search results and the search footer URL if there is no value.
	            if (!value || value === '') {
	                searchResults.value = [];
	                searchFooterUrl.value = '';
	                return;
	            }
	
	            fetchResults(value).then((data) => {
	                // Make sure this data is still relevant first.
	                if (currentSearchTerm.value === value) {
	                    // If there are results, format them into an array of
	                    // SearchResults to be passed into TypeaheadSearch for
	                    // display as a menu of search results.
	                    searchResults.value = data.search && data.search.length > 0 ?
	                        adaptApiResponse(data.search) :
	                        [];
	
	                    // Set the search footer URL to a link to the search
	                    // page for the current search query.
	                    searchFooterUrl.value = `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(value)}&title=Special%3ASearch&fulltext=1`;
	                }
	            }).catch(() => {
	                // On error, reset search results and search footer URL.
	                searchResults.value = [];
	                searchFooterUrl.value = '';
	            });
	        }

	        function deduplicateResults(results) {
	            const seen = new Set(searchResults.value.map((result) => result.value));
	            return results.filter((result) => !seen.has(result.value));
	        }
	
	        function onLoadMore() {
	            // eslint-disable-next-line no-console
	            console.log('load-more event emitted');
	
	            if (!currentSearchTerm.value) {
	                return;
	            }
	
	            fetchResults(currentSearchTerm.value, searchResults.value.length).then((data) => {
	                const results = data.search && data.search.length > 0 ?
	                    adaptApiResponse(data.search) :
	                    [];
	
	                const deduplicatedResults = deduplicateResults(results);
	                searchResults.value.push(...deduplicatedResults);
	            });
	        }
	
	        function onSearchResultClick(value) {
	            // eslint-disable-next-line no-console
	            console.log('search-result-click event emitted with value:', value);
	        }
	
	        function onSubmit(value) {
	            // eslint-disable-next-line no-console
	            console.log('submit event emitted with value:', value);
	        }
	
	        return {
	            searchResults,
	            searchFooterUrl,
	            onInput,
	            onLoadMore,
	            onSearchResultClick,
	            onSubmit
	        };
		},
		mounted() {
			dialogTrigger.addEventListener( 'click', this.openDialog );
		},
		unMounted() {
			dialogTrigger.removeEventListener( this.openDialog );
		}
	} )
	.component( 'cdx-dialog', Codex.CdxDialog )
	.component( 'cdx-text-input', Codex.CdxTextInput )
	.component( 'cdx-text-area', Codex.CdxTextArea )
	.component( 'cdx-button', Codex.CdxButton )
	.component( 'cdx-typeahead-search', Codex.CdxTypeaheadSearch )
	.mount( mountPoint );
} );
