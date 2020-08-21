import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers';

import { Header, Alert } from 'components';
import { Input, Form } from 'components/form-fields';
import { login as loginSchema } from 'app/schema';
import { loginUser } from 'store/user/login';

const initialValues = {
  user: {
    email: '',
    password: '',
  }
};

function Login(props) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [remoteErrors, setRemoteErrors] = useState({});

  const {
    formState, ...methods
  } = useForm({
    mode: 'all',
    resolver: yupResolver(loginSchema),
    defaultValues: initialValues
  });

  let disabled = true;
  if (formState.isDirty && formState.isValid && formState.isSubmitting === false) {
    disabled = false;
  };

  const onSubmit = async (data) => {
    const user = data.user;
    try {
      const result = await dispatch(loginUser({ user }));
      setRemoteErrors({});
      navigate('/', { state: result });
    } catch (errors) {
      setRemoteErrors(errors);
    }
  };

  let serverErrors = null;
  if (remoteErrors && Object.keys(remoteErrors).length) {
    serverErrors = <Alert klass="alert-danger" message={remoteErrors} />;
  }

  return (
    <>
      <Header />
      <main className="page">
        <Form onSubmit={onSubmit} methods={methods}>
          <h2>Login to your account</h2>
          {
            serverErrors
          }
          <Input
            wrapUsing="div" type="email"
            name="user.email" placeholder="Email - jane@test.com" />
          <Input
            wrapUsing="div" type="password"
            name="user.password" placeholder="Password" />
          <button type="submit" disabled={disabled}>Submit</button>
        </Form>
      </main>
    </>
  );
};

export default Login;
