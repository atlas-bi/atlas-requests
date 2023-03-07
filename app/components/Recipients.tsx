import {
  faCheck,
  faCircleNotch,
  faPencil,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from '@remix-run/react';
import { type MutableRefObject, type RefObject, forwardRef } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';

import CheckRemove from './CheckRemove';
import { MiniUser } from './User';

const { MeiliSearch } = require('meilisearch');

export const RecipientSelector = forwardRef(
  ({ me, recipients, actionData, MEILISEARCH_URL, onChange, action }, ref) => {
    const [watchState, setWatchState] = useState(false);
    const [recipientList, setRecipientList] = useState(recipients || []);
    const [showRecipientSearch, setShowRecipientSearch] = useState(false);
    const recipientPopout = useRef<HTMLDivElement>();
    const client = new MeiliSearch({ host: MEILISEARCH_URL });

    const [recipientSearchResults, setRecipientSearchResults] = useState(null);

    const inputReference = useRef<HTMLInputElement>(null);

    useEffect(() => {
      window.addEventListener(
        'click',
        (e) => {
          if (
            recipientPopout.current &&
            !recipientPopout.current.contains(event.target as Node)
          ) {
            setShowRecipientSearch(false);
          }
        },
        { capture: true },
      );
      window.addEventListener('keydown', (event) => {
        const e = event || window.event;
        if (e.key === 'Esc' || e.key === 'Escape') {
          setShowRecipientSearch(false);
        }
      });
    }, []);

    useEffect(() => {
      if (onChange) {
        if (watchState === false) {
          console.log('returning');
          setWatchState(true);
          return;
        }
        onChange();
      }
    }, [recipientList]);

    const transition = useTransition();

    const isSaving =
      transition.state === 'submitting' &&
      transition.submission.formData.get('_action') === action;

    const hasSaved =
      (transition.state === 'loading' || transition.state === 'idle') &&
      transition.submission &&
      transition.submission.formData.get('_action') === action;

    useEffect(() => {
      inputReference.current?.focus();
    }, [showRecipientSearch, recipientList]);

    return (
      <>
        <div className="popout" ref={recipientPopout}>
          <label
            className="popout-trigger"
            onClick={(e) => {
              setShowRecipientSearch(true);
            }}
          >
            <span>Subscriber List</span>
            <span className="icon mr-2">
              <FontAwesomeIcon icon={faPencil} />
            </span>
          </label>
          {showRecipientSearch && (
            <div className="popout-menu">
              <div className="popout-content has-background-light">
                <strong className="py-2 px-3 is-block ">
                  Add subscribers to this report
                </strong>
                <hr />
                <div className="py-2 px-3 has-background-white">
                  <input
                    ref={inputReference}
                    className="input"
                    onChange={async (e) => {
                      const searchInput = e.target;
                      if (searchInput.value.length == 0) {
                        setRecipientSearchResults(null);
                      } else {
                        const matches = await client
                          .index('atlas-requests-users')
                          .search(searchInput.value, { limit: 20 });

                        if (matches.hits.length > 0) {
                          setRecipientSearchResults(
                            <>
                              {matches.hits.map((user) => (
                                <MiniUser
                                  key={user.id}
                                  user={user}
                                  onClick={() => {
                                    if (!recipientList.includes(user)) {
                                      setRecipientList([
                                        ...recipientList,
                                        user,
                                      ]);
                                    }
                                    setRecipientSearchResults(null);
                                    searchInput.value = '';
                                    // setShowRecipientSearch(false)
                                  }}
                                  linkToUser={false}
                                />
                              ))}
                            </>,
                          );
                        } else {
                          setRecipientSearchResults(
                            <strong className="py-2 px-3 is-block ">
                              No matches.
                            </strong>,
                          );
                        }
                      }
                    }}
                  />
                </div>
                <hr />
                {recipientList && (
                  <>
                    <div
                      onClick={() => setRecipientList([])}
                      className="is-flex has-background-white is-clickable"
                      style={{ height: '35px' }}
                    >
                      <span className="icon my-auto has-text-grey mx-2">
                        <FontAwesomeIcon icon={faXmark} />
                      </span>
                      <span className="my-auto">Clear List</span>
                    </div>
                    {recipientList.map((recipient) => (
                      <CheckRemove key={recipient.id}>
                        <MiniUser
                          key={recipient.id}
                          user={recipient}
                          onClick={() => {
                            setRecipientList(
                              recipientList.filter((x) => x !== recipient),
                            );
                            setRecipientSearchResults(null);
                          }}
                          linkToUser={false}
                        />
                      </CheckRemove>
                    ))}
                    <hr />
                  </>
                )}

                {recipientSearchResults || (
                  <>
                    <strong className="py-2 px-3 is-block ">Suggestions</strong>
                    <hr />
                    <MiniUser
                      user={me}
                      onClick={() => {
                        if (!recipientList.includes(me)) {
                          setRecipientList([...recipientList, me]);
                        }
                        setRecipientSearchResults(null);
                        // setShowRecipientSearch(false)
                      }}
                    />
                    ... boss or others?
                  </>
                )}
              </div>
            </div>
          )}

          <input
            type="hidden"
            ref={ref}
            name="requestedFor"
            // value={}
          />
          {recipientList &&
            recipientList.map((recipient) => (
              <div>
                <MiniUser user={recipient}></MiniUser>
              </div>
            ))}

          {(!recipientList || recipientList?.length === 0) && 'No one—'}

          {!recipientList?.includes(me) && (
            <>
              <span
                className="has-text-link is-clickable"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!recipientList.includes(me)) {
                    setRecipientList([...recipientList, me]);
                  }
                }}
              >
                add yourself
              </span>
            </>
          )}

          {isSaving ? (
            <span className="icon has-text-warning my-auto is-pulled-right">
              <FontAwesomeIcon icon={faCircleNotch} size="lg" spin />
            </span>
          ) : (
            <span
              className="icon has-text-success my-auto is-pulled-right"
              style={{
                transition: 'opacity .2s',
                transitionDelay: '1s',
                opacity: hasSaved ? '1' : '0',
              }}
            >
              <FontAwesomeIcon icon={faCheck} size="lg" />
            </span>
          )}

          {actionData?.errors?.requestedFor && (
            <p className="help is-danger">{actionData.errors.requestedFor}</p>
          )}
        </div>
        <hr />
      </>
    );
  },
);