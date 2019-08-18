declare module 'gherkin' {

    interface Document {
        feature: Feature;
    }

    interface Feature extends Block {
        type: 'Feature';
        tags: string[];
        name: string;
        children: (Scenario | ScenarioOutline)[];
    }

    interface Scenario extends Block {
        type: 'Scenario';
        tags: string[];
        name: string;
        steps: Step[];
    }
    
    interface ScenarioOutline extends Scenario {
        type: 'ScenarioOutline';
        examples: Examples[];
    }

    interface Examples extends Block {
        type: 'Examples';
        tableHeader: TableRow;
        tableBody: TableRow[];
    }

    interface TableRow extends DocumentNode {
        type: 'TableRow';
        cells: TableCell[];
    }

    interface TableCell extends DocumentNode {
        type: 'TableCell';
        value: string;
    }

    interface Step extends Block {
        type: 'Step';
        text: string;
    }

    interface DocumentNode {
        type: string;
        location: { line: number, column: number };
    }

    interface Block extends DocumentNode {
        keyword: string;
    }

    interface Pickle {
        name: string;
    }

    interface MediaType {
        encoding: string;
        type: string;
    }

    interface SourcePosition {
        line: number;
        column: number;
    }

    interface Event {
        type: string;
        uri: string;
    }

    interface SourceEvent extends Event {
        type: 'source';
        data: any;
        media: MediaType;
    }

    interface DocumentEvent extends Event {
        type: 'gherkin-document';
        document: Document;
    }

    interface PickleEvent extends Event {
        type: 'pickle';
        pickle: Pickle;
    }

    interface AttachmentEvent extends Event {
        type: 'attachment';
        source: { uri: string, start: SourcePosition };
        data: any;
        media: MediaType;
    }

    type GeneratedEvent = SourceEvent | DocumentEvent | PickleEvent | AttachmentEvent;

    export function generateEvents(data, uri, types, language): GeneratedEvent[];
}