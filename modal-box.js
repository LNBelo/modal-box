const elementGpgp = document.getElementById('gpgp-modal');

mw.loader.using('@wikimedia/codex').then(function (require) {
	const Vue = require('vue');
	const Codex = require('@wikimedia/codex');
	const mountPoint = elementGpgp.appendChild(document.createElement('div'));

	Vue.createMwApp({
		data: function () {
			return {
				showDialog: false,
				currentTab: 'Sobre',
				tabsData: [{
					name: 'Sobre',
					label: 'Sobre'
				}, {
					name: 'Pesquisadores',
					label: 'Pesquisadores'
				}, {
					name: 'Publicações',
					label: 'Publicações'
				}, {
					name: 'Identidade visual',
					label: 'Identidade visual'
				}, {
					name: 'Contato',
					label: 'Contato'
				}],
			};
		},
		template: `
<cdx-button action="progressive" weight="primary">Criar Grupo de Pesquisa</cdx-button>

<cdx-dialog v-model:open="showDialog" title="Grupo de Pesquisa" close-button-label="Close"
	:default-action="defaultAction" @default="open = false">

	<cdx-tabs v-model:active="currentTab" :framed="framed">
		<cdx-tab v-for="( tab, index ) in tabsData" :key="index" :name="tab.name" :label="tab.label"
			:disabled="tab.disabled">
			<template v-if="tab.name === 'Sobre'">
				<br>
				<cdx-field>
					<template #label>Título</template>
					<cdx-text-input v-model="inputValue" aria-label="TextInput default demo"></cdx-text-input>
				</cdx-field>

				<cdx-field>
					<template #label>Descrição</template>
					<cdx-text-area v-model="textareaValue" aria-label="TextArea default demo"></cdx-text-area>
				</cdx-field>

				<cdx-field optionalFlag="(opcional)">
					<template #label>Nomes alternativos</template>
					<template #help-text>São siglas ou abreviações do nome do grupo de pesquisa.</template>
					<cdx-chip-input v-model:input-chips="aliasChips" remove-button-label="Remove"></cdx-chip-input>
				</cdx-field>
			</template>
			<template v-if="tab.name === 'Pesquisadores'">
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

					<cdx-lookup v-model:selected="selection" :menu-items="menuItems" :menu-config="menuConfig"
						@input="onInput" @load-more="onLoadMore" @update:selected="insertSelectedInChipInput">
						<template #no-results>
							Nenhum resultado encontrado.
						</template>
					</cdx-lookup>

					<cdx-chip-input v-model:input-chips="researchersChips" remove-button-label="Remove"
						separateInput="true"></cdx-chip-input>
				</cdx-field>
			</template>
			<template v-if="tab.name === 'Publicações'">
			</template>
			<template v-if="tab.name === 'Identidade visual'">
			</template>
			<template v-if="tab.name === 'Contato'">
			</template>
		</cdx-tab>
	</cdx-tabs>
</cdx-dialog>
		`,
		methods: {
			openDialog() {
				this.showDialog = true;
			}
		},
		setup() {
			const selection = ref(null);
			const menuItems = ref([]);
			const currentSearchTerm = ref('');
			const researchersChips = ref([]);
			const aliasChips = ref([]);
			const menuConfig = {
				visibleItemLimit: 6
			};

			function ref(value) {
				return Vue.ref(value);
			}

			function insertSelectedInChipInput() {
				// selected value has a QID
				if (selection.value !== null) {

					// iterates over suggested items to find the selected item
					for (let item of menuItems.value) {
						if (item.value == selection.value) {

							// manipulates chipInput values
							var payload = item.label + " (" + item.value + ")";
							var payloadInChips = false;
							var chips = researchersChips.value;
							for (let chip of chips) {
								if (payload == chip.value) {
									payloadInChips = true;
									break;
								}
							}
							if (payloadInChips == false) {
								chips.push({ value: payload });
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
			function fetchResults(searchTerm, offset) {
				const params = new URLSearchParams({
					origin: '*',
					action: 'wbsearchentities',
					format: 'json',
					limit: '10',
					props: 'url',
					language: 'en',
					search: searchTerm
				});
				if (offset) {
					params.set('continue', String(offset));
				}
				return fetch(`https://www.wikidata.org/w/api.php?${params.toString()}`)
					.then((response) => response.json());
			}

			/**
			 * Handle lookup input.
			 *
			 * TODO: this should be debounced.
			 *
			 * @param {string} value
			 */
			function onInput(value) {
				// Internally track the current search term.
				currentSearchTerm.value = value;

				// Do nothing if we have no input.
				if (!value) {
					menuItems.value = [];
					return;
				}

				fetchResults(value)
					.then((data) => {
						// Make sure this data is still relevant first.
						if (currentSearchTerm.value !== value) {
							return;
						}

						// Reset the menu items if there are no results.
						if (!data.search || data.search.length === 0) {
							menuItems.value = [];
							return;
						}

						// Build an array of menu items.
						const results = data.search.map((result) => {
							return {
								label: result.label,
								value: result.id,
								description: result.description
							};
						});

						// Update menuItems.
						menuItems.value = results;
					})
					.catch(() => {
						// On error, set results to empty.
						menuItems.value = [];
					});
			}

			function deduplicateResults(results) {
				const seen = new Set(menuItems.value.map((result) => result.value));
				return results.filter((result) => !seen.has(result.value));
			}

			function onLoadMore() {
				if (!currentSearchTerm.value) {
					return;
				}

				fetchResults(currentSearchTerm.value, menuItems.value.length)
					.then((data) => {
						if (!data.search || data.search.length === 0) {
							return;
						}

						const results = data.search.map((result) => {
							return {
								label: result.label,
								value: result.id,
								description: result.description
							};
						});

						// Update menuItems.
						const deduplicatedResults = deduplicateResults(results);
						menuItems.value.push(...deduplicatedResults);
					});
			}

			return {
				selection,
				menuItems,
				menuConfig,
				onInput,
				onLoadMore,
				researchersChips,
				aliasChips,
				insertSelectedInChipInput
			};
		},
		mounted() {
			elementGpgp.addEventListener('click', this.openDialog);
		},
		unMounted() {
			elementGpgp.removeEventListener(this.openDialog);
		}
	})
		.component('cdx-tab', Codex.CdxTab)
		.component('cdx-tabs', Codex.CdxTabs)
		.component('cdx-field', Codex.CdxField)
		.component('cdx-lookup', Codex.CdxLookup)
		.component('cdx-button', Codex.CdxButton)
		.component('cdx-dialog', Codex.CdxDialog)
		.component('cdx-text-area', Codex.CdxTextArea)
		.component('cdx-text-input', Codex.CdxTextInput)
		.component('cdx-chip-input', Codex.CdxChipInput)
		.mount(mountPoint);
});
