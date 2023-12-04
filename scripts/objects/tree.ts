import { Component } from "obsidian";
import { MarkdownRenderer } from "scripts/html-generation/markdown-renderer";
import { Path } from "scripts/utils/path";

export class Tree
{
	public children: TreeItem[] = [];
	public minCollapsableDepth: number = 1;
	public title: string = "Tree";
	public class: string = "mod-tree-none";
	public showNestingIndicator = true;
	public minDepth: number = 1; 
	public generateWithItemsClosed: boolean = false;
	public makeLinksWebStyle: boolean = false;
	public renderMarkdownTitles: boolean = true;
	public container: HTMLElement | undefined = undefined;

	protected async buildTreeRecursive(tree: TreeItem, container: HTMLElement, minDepth:number = 1, closeAllItems: boolean = false): Promise<void>
	{
		let treeItem = await tree.generateItemHTML(container, closeAllItems);

		if(!tree.childContainer) return;

		for (let item of tree.children)
		{
			if(item.depth < minDepth) continue;
			await this.buildTreeRecursive(item, tree.childContainer, minDepth, closeAllItems);
		}
	}

	//**Generate the raw tree with no extra containers or buttons*/
	public async generateTree(container: HTMLElement)
	{
		for (let item of this.children)
		{
			await this.buildTreeRecursive(item, container, this.minDepth, this.generateWithItemsClosed);
		}

		this.forAllChildren((child) =>
		{
			if (child.isCollapsed) child.setCollapse(true, false);
		});
	}
	
	//**Generate a tree with a title and full tree collapse button*/
	public async generateTreeWithContainer(container: HTMLElement)
	{
		/*
		- div.tree-container
			- div.tree-header
				- span.sidebar-section-header
				- button.collapse-tree-button
					- svg
			- div.tree-scroll-area
				- div.tree-item
					- div.tree-item-contents
						- div.tree-item-icon
							- svg
						- a.internal-link
							- span.tree-item-title
					- div.tree-item-children
		*/

		this.container = container;
		
		let treeContainerEl = container.createDiv();
		let treeHeaderEl = container.createDiv();
		let sectionHeaderEl = container.createEl('span');
		let collapseAllEl = container.createEl('button');
		let treeScrollAreaEl = container.createDiv();

		treeContainerEl.classList.add('tree-container', this.class);
		treeHeaderEl.classList.add("tree-header");
		sectionHeaderEl.classList.add("sidebar-section-header");
		collapseAllEl.classList.add("clickable-icon", "collapse-tree-button");
		collapseAllEl.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'></svg>";
		treeScrollAreaEl.classList.add("tree-scroll-area");

		if (this.generateWithItemsClosed) collapseAllEl.classList.add("is-collapsed");
		if (this.showNestingIndicator) treeContainerEl.classList.add("mod-nav-indicator");

		treeContainerEl.setAttribute("data-depth", "0");
		sectionHeaderEl.innerText = this.title;

		treeContainerEl.appendChild(treeHeaderEl);
		treeContainerEl.appendChild(treeScrollAreaEl);
		treeHeaderEl.appendChild(sectionHeaderEl);
		treeHeaderEl.appendChild(collapseAllEl);

		await this.generateTree(treeScrollAreaEl);
	}

	public sortAlphabetically(reverse: boolean = false)
	{
		this.children.sort((a, b) => reverse ? b.title.localeCompare(a.title, undefined, { numeric: true }) : a.title.localeCompare(b.title, undefined, { numeric: true }));
		for (let child of this.children)
		{
			child.sortAlphabetically();
		}
	}

	public forAllChildren(func: (child: TreeItem) => void, recursive: boolean = true)
	{
		for (let child of this.children)
		{
			func(child);
			if (recursive) child.forAllChildren(func);
		}
	}
}

export class TreeItem
{
	public tree: Tree;
	public children: TreeItem[] = [];
	public parent: TreeItem | Tree;
	public depth: number = 0;
	public itemClass: string = "";
	public title: string = "";
	public href: string | undefined = undefined;
	public minCollapsableDepth: number = 1;
	public isCollapsed: boolean = false;
	public childContainer: HTMLDivElement | undefined = undefined;

	public itemEl: HTMLDivElement | undefined = undefined;

	public constructor(tree: Tree, parent: TreeItem | Tree, depth: number)
	{
		this.tree = tree;
		this.parent = parent;
		this.depth = depth;
	}

	public async generateItemHTML(container: HTMLElement, startClosed: boolean = true): Promise<HTMLDivElement>
	{

		/*
		- div.tree-item-wrapper
			- div.tree-item-contents
				- a.internal-link.tree-item-link
					- div.tree-item-icon
						- svg
					- span.tree-item-title
			- div.tree-item-children
		*/

		this.itemEl = this.createItemWrapper(container);
		let itemContentsEl = this.createItemContents(this.itemEl);
		let itemLinkEl = this.createItemLink(itemContentsEl);

		if (this.isCollapsible())
		{
			this.createItemIcon(itemLinkEl);
			if (startClosed) 
			{
				this.itemEl.classList.add("is-collapsed");
				this.isCollapsed = true;
			}
		}

		await this.createItemTitle(itemLinkEl);
		this.createItemChildren(this.itemEl);

		return this.itemEl;
	}

	public forAllChildren(func: (child: TreeItem) => void, recursive: boolean = true)
	{
		for (let child of this.children)
		{
			func(child);
			if (recursive) child.forAllChildren(func);
		}
	}
	
	public async setCollapse(collapsed: boolean, animate = true)
	{
		if (!this.isCollapsible()) return;
		if (!this.itemEl || !this.itemEl.classList.contains("mod-collapsible")) return;

		let children = this.itemEl.querySelector(".tree-item-children") as HTMLElement;

		if (children == null) return;

		if (collapsed)
		{
			this.itemEl.classList.add("is-collapsed");
			if(animate) this.slideUp(children, 100);
			else children.style.display = "none";
		}
		else
		{
			this.itemEl.classList.remove("is-collapsed");
			if(animate) this.slideDown(children, 100);
			else children.style.removeProperty("display");
		}

		this.isCollapsed = collapsed;
	}

	public toggleCollapse()
	{
		if (!this.itemEl) return;
		this.setCollapse(!this.itemEl.classList.contains("is-collapsed"));
	}

	public sortAlphabetically(reverse: boolean = false)
	{
		this.children.sort((a, b) => reverse ? b.title.localeCompare(a.title, undefined, { numeric: true }) : a.title.localeCompare(b.title, undefined, { numeric: true }));
		for (let child of this.children)
		{
			child.sortAlphabetically();
		}
	}

	protected isCollapsible(): boolean
	{
		return this.children.length != 0 && this.depth >= this.minCollapsableDepth;
	}

	protected createItemWrapper(container: HTMLElement): HTMLDivElement
	{
		let itemEl = container.createDiv();
		itemEl.classList.add("tree-item");
		if (this.itemClass.trim() != "") itemEl.classList.add(this.itemClass);
		itemEl.setAttribute("data-depth", this.depth.toString());
		if (this.isCollapsible()) itemEl.classList.add("mod-collapsible");
		return itemEl;
	}

	protected createItemContents(container: HTMLElement): HTMLDivElement
	{
		let itemContentsEl = container.createDiv("tree-item-contents");
		return itemContentsEl;
	}

	protected createItemLink(container: HTMLElement): HTMLAnchorElement
	{
		if (this.tree.makeLinksWebStyle && this.href) this.href = Path.toWebStyle(this.href);
		let itemLinkEl = container.createEl("a", { cls: "internal-link tree-item-link NO-UNDERLINE" });
		if (this.href) itemLinkEl.setAttribute("href", this.href);
		return itemLinkEl;
	}

	protected createItemIcon(container: HTMLElement): HTMLElement
	{
		const arrowIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg>`;

		let itemIconEl = container.createDiv("tree-item-icon collapse-icon");
		itemIconEl.innerHTML = arrowIcon;
		return itemIconEl;
	}

	protected async createItemTitle(container: HTMLElement): Promise<HTMLSpanElement>
	{
		let titleEl = container.createEl("span", { cls: "tree-item-title" });
		if (this.tree.renderMarkdownTitles) MarkdownRenderer.renderSingleLineMarkdown(this.title, titleEl);
		else titleEl.innerText = this.title;
		return titleEl;
	}

	protected createItemChildren(container: HTMLElement): HTMLDivElement
	{
		this.childContainer = container.createDiv("tree-item-children");
		return this.childContainer;
	}


	protected slideUp(target: HTMLElement, duration=500)
	{
		target.style.transitionProperty = 'height, margin, padding';
		target.style.transitionDuration = duration + 'ms';
		target.style.boxSizing = 'border-box';
		target.style.height = target.offsetHeight + 'px';
		target.offsetHeight;
		target.style.overflow = 'hidden';
		target.style.height = "0";
		target.style.paddingTop = "0";
		target.style.paddingBottom = "0";
		target.style.marginTop = "0";
		target.style.marginBottom = "0";
		window.setTimeout(async () => {
				target.style.display = 'none';
				target.style.removeProperty('height');
				target.style.removeProperty('padding-top');
				target.style.removeProperty('padding-bottom');
				target.style.removeProperty('margin-top');
				target.style.removeProperty('margin-bottom');
				target.style.removeProperty('overflow');
				target.style.removeProperty('transition-duration');
				target.style.removeProperty('transition-property');
		}, duration);
	}

	protected slideDown(target: HTMLElement, duration=500)
	{
		target.style.removeProperty('display');
		let display = window.getComputedStyle(target).display;
		if (display === 'none') display = 'block';
		target.style.display = display;
		let height = target.offsetHeight;
		target.style.overflow = 'hidden';
		target.style.height = "0";
		target.style.paddingTop = "0";
		target.style.paddingBottom = "0";
		target.style.marginTop = "0";
		target.style.marginBottom = "0";
		target.offsetHeight;
		target.style.boxSizing = 'border-box';
		target.style.transitionProperty = "height, margin, padding";
		target.style.transitionDuration = duration + 'ms';
		target.style.height = height + 'px';
		target.style.removeProperty('padding-top');
		target.style.removeProperty('padding-bottom');
		target.style.removeProperty('margin-top');
		target.style.removeProperty('margin-bottom');
		window.setTimeout(async () => {
			target.style.removeProperty('height');
			target.style.removeProperty('overflow');
			target.style.removeProperty('transition-duration');
			target.style.removeProperty('transition-property');
		}, duration);
	}
}
