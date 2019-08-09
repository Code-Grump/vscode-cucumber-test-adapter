declare module 'gherkin' {

    interface Document {

    }

    interface Pickle {
        title: string;
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