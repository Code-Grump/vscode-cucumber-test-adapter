declare module 'gherkin' {

    interface Document {
        feature: Feature;
    }

    interface Feature extends DocumentNode {
        type: 'Feature';
        tags: string[];
        name: string;
        children: Scenario[];
    }

    interface Scenario extends DocumentNode {
        type: 'Scenario';
        tags: string[];
        name: string;
        steps: Step[];
    }

    interface Step extends DocumentNode {
        type: 'Step';
        text: string;
    }

    interface DocumentNode {
        type: string;
        location: { line: number, column: number };
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