import React from 'react';
import PropTypes from 'prop-types';

Form.propTypes = {
  methods: PropTypes.object,
  onSubmit: PropTypes.func,
};

/*
A thin wrapper to ease the requirement of having to pass `register` and
`errors` props to `input` elements of a form.

Usage:
const {formState, ...methods } = useForm(...);
const onSubmit = (data) => console.log(data);

let disabled = true;
if (formState.isDirty && formState.isValid && formState.isSubmitting === false) {
  disabled = false;
};

<Form onSubmit={onSubmit} methods={methods}>
  ...
  <div>
    <Input
      wrapUsing="div" type="password"
      name="user.password" placeholder="Password" />
  </div>
  <button type="submit" disabled={disabled}>Submit</button>
</Form>

NOTE:
- works only on those input elements that have a name attribute
- handles only evel 1 children; won't work if `input` fields
  are nested
- use the `wrapUsing` prop on any of `Input` based form elements to wrap
  and avoid the above limitation to at least get a level 2 nested
  `input` field
*/
export function Form(
  { methods, children, onSubmit, ...rest }
) {
  const { handleSubmit } = methods;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {React.Children.map(children, child => {
        let formifiedChild = child;
        // console.log('formifiedChild', child);
        if (child && child.props && child.props.name) {
          formifiedChild = React.createElement(child.type, {
            ...{
              ...child.props,
              register: methods.register,
              errors: methods.errors,
              key: child.props.name
            }
          });
        }
        return formifiedChild;
       })}
    </form>
  );
};
